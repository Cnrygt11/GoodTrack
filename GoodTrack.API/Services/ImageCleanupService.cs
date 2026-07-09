using System.Threading.Tasks;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;

namespace GoodTrack.API.Services;

/// <summary>
/// <see cref="IImageCleanupService"/> uygulaması. Silme kuralları, önceki kopyalanmış
/// private helper'ların davranışını birebir korur.
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

        var otherProducts = await _productRepository.GetProductsBySellerAsync(sellerId);
        bool isUsedInOthers = otherProducts.Exists(p => p.Id != currentProductId && p.Image == imageUrl);
        if (isUsedInOthers) return;

        var catalog = await _catalogRepository.GetCatalogBySellerAsync(sellerId);
        bool isUsedInCatalog = catalog.Exists(c => c.Image == imageUrl);
        if (isUsedInCatalog) return;

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

        var otherProducts = await _productRepository.GetProductsBySellerAsync(sellerId);
        bool isUsedInOthers = otherProducts.Exists(p => p.Id != currentProductId && p.DefectImage == imageUrl);
        if (isUsedInOthers) return;

        bool isUsedAsMain = otherProducts.Exists(p => p.Image == imageUrl);
        if (isUsedAsMain) return;

        var catalog = await _catalogRepository.GetCatalogBySellerAsync(sellerId);
        bool isUsedInCatalog = catalog.Exists(c => c.Image == imageUrl);
        if (isUsedInCatalog) return;

        await _imageStorageService.DeleteImageAsync(imageUrl);
    }

    public async Task DeleteCatalogImageIfUnusedAsync(string? imageUrl, string sellerId, string currentCatalogProductId)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return;

        // Aynı görseli kullanan başka katalog ürünü var mı?
        var catalog = await _catalogRepository.GetCatalogBySellerAsync(sellerId);
        bool isUsedInCatalog = catalog.Exists(c => c.Id != currentCatalogProductId && c.Image == imageUrl);
        if (isUsedInCatalog) return;

        // Görseli kullanan aktif sipariş var mı?
        var orders = await _productRepository.GetProductsBySellerAsync(sellerId);
        bool isUsedInOrders = orders.Exists(p => p.Image == imageUrl);
        if (isUsedInOrders) return;

        await _imageStorageService.DeleteImageAsync(imageUrl);
    }
}
