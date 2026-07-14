using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Repositories;

public interface ICatalogRepository
{
    Task<CatalogProduct?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<List<CatalogProduct>> GetCatalogBySellerAsync(string sellerId, CancellationToken cancellationToken = default);
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
}
