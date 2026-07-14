using System.Threading.Tasks;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;

namespace GoodTrack.API.Services;

/// <summary>
/// <see cref="IImageCleanupService"/> uygulaması. Kullanım kontrolleri, satırları belleğe
/// yüklemek yerine hedefli EXISTS sorgularıyla (AnyAsync) DB'de yapılır: eski uygulama her
/// temizlikte satıcının TÜM siparişlerini/kataloğunu ağır base64 kolonlarıyla yüklüyordu.
/// Silme kuralları önceki davranışı birebir korur (data-URI kısa devresi, hariç tutma
/// kapsamları ve kontrol sırası aynı).
/// </summary>
public sealed class ImageCleanupService : IImageCleanupService
{
    private readonly IProductRepository _productRepository;
    private readonly ICatalogRepository _catalogRepository;
    private readonly IImageStorageService _imageStorageService;

    public ImageCleanupService(
        IProductRepository productRepository,
        ICatalogRepository catalogRepository,
        IImageStorageService imageStorageService)
    {
        _productRepository = productRepository;
        _catalogRepository = catalogRepository;
        _imageStorageService = imageStorageService;
    }

    public async Task DeleteOrderImageIfUnusedAsync(string? imageUrl, string sellerId, string currentProductId)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return;

        if (imageUrl.StartsWith("data:image"))
        {
            await _imageStorageService.DeleteImageAsync(imageUrl);
            return;
        }

        if (await _productRepository.IsImageUsedBySellerAsync(sellerId, imageUrl, currentProductId)) return;

        if (await _catalogRepository.IsImageUsedBySellerAsync(sellerId, imageUrl, excludeCatalogProductId: null)) return;

        await _imageStorageService.DeleteImageAsync(imageUrl);
    }

    public async Task DeleteDefectImageIfUnusedAsync(string? imageUrl, string sellerId, string currentProductId)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return;

        if (imageUrl.StartsWith("data:image"))
        {
            await _imageStorageService.DeleteImageAsync(imageUrl);
            return;
        }

        if (await _productRepository.IsDefectImageUsedBySellerAsync(sellerId, imageUrl, currentProductId)) return;

        // Ana görsel kontrolünde mevcut sipariş de kapsanır (excludeProductId: null) —
        // görsel aynı siparişin ana görseliyse de silinmemelidir.
        if (await _productRepository.IsImageUsedBySellerAsync(sellerId, imageUrl, excludeProductId: null)) return;

        if (await _catalogRepository.IsImageUsedBySellerAsync(sellerId, imageUrl, excludeCatalogProductId: null)) return;

        await _imageStorageService.DeleteImageAsync(imageUrl);
    }

    public async Task DeleteCatalogImageIfUnusedAsync(string? imageUrl, string sellerId, string currentCatalogProductId)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return;

        // Aynı görseli kullanan başka katalog ürünü var mı?
        if (await _catalogRepository.IsImageUsedBySellerAsync(sellerId, imageUrl, currentCatalogProductId)) return;

        // Görseli kullanan sipariş var mı (arşiv dahil)?
        if (await _productRepository.IsImageUsedBySellerAsync(sellerId, imageUrl, excludeProductId: null)) return;

        await _imageStorageService.DeleteImageAsync(imageUrl);
    }
}
