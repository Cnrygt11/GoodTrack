using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using GoodTrack.API.Models;
using GoodTrack.API.DTOs.Product;

namespace GoodTrack.API.Abstractions.Repositories;

public interface ICatalogRepository
{
    Task<CatalogProduct?> GetByIdAsync(string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Katalog listesi için hafif projeksiyon: tam <c>Image</c> DB'den çekilmez (yalnız
    /// <c>ThumbnailImage</c> taşınır). Tam görsel için <see cref="GetByIdAsync"/> üzerinden
    /// detay ucu kullanılır (bkz. sipariş listesindeki aynı desen: IProductRepository).
    /// </summary>
    Task<List<CatalogProductResponseDto>> GetCatalogSummariesBySellerAsync(string sellerId, CancellationToken cancellationToken = default);
    Task<bool> HasProductCodeAsync(string sellerId, string code);

    /// <summary>
    /// Görselin (URL) satıcının başka bir katalog ürününde kullanılıp kullanılmadığını DB'de
    /// kontrol eder (satırlar belleğe yüklenmez). <paramref name="excludeCatalogProductId"/>
    /// null ise hiçbir katalog ürünü hariç tutulmaz. Yalnız data-URI OLMAYAN (legacy/harici URL)
    /// görsellerde çağrılır.
    /// </summary>
    Task<bool> IsImageUsedBySellerAsync(string sellerId, string imageUrl, string? excludeCatalogProductId, CancellationToken cancellationToken = default);
    Task SaveAsync(CatalogProduct product, CancellationToken cancellationToken = default);
    Task DeleteAsync(string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Satıcının tüm katalog ürünlerini İZLENEN (tracked) entity olarak döner; Etsy içe
    /// aktarımı bunların üzerinde değişiklik yapıp <see cref="SaveChangesAsync"/> ile toplu kaydeder.
    /// </summary>
    Task<List<CatalogProduct>> GetAllBySellerAsync(string sellerId, CancellationToken cancellationToken = default);

    /// <summary>SKU (ProductCode) veya "etsy-{listingId}" fallback koduna göre katalog ürünü bulur.</summary>
    Task<CatalogProduct?> FindBySkuOrEtsyListingAsync(string sellerId, string? sku, long listingId, CancellationToken cancellationToken = default);

    /// <summary>Yeni ürünü context'e ekler (SaveChangesAsync çağrılana kadar kalıcı olmaz).</summary>
    Task AddAsync(CatalogProduct product, CancellationToken cancellationToken = default);

    /// <summary>Bekleyen değişiklikleri (toplu Etsy içe aktarımı) kalıcı hale getirir.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
