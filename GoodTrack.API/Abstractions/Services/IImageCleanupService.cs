using System.Threading.Tasks;

namespace GoodTrack.API.Abstractions.Services;

/// <summary>
/// Bir görselin başka ürün/katalog kayıtlarında hâlâ kullanılıp kullanılmadığını
/// (reference counting) kontrol edip güvenliyse depodan silen yardımcı servis.
/// Daha önce ProductService, OrderWorkflowService ve CatalogService içinde
/// kopyalanmış olan silme mantığını tek yerde toplar.
/// </summary>
public interface IImageCleanupService
{
    /// <summary>Bir siparişin ana görselini, başka sipariş/katalogda kullanılmıyorsa siler.</summary>
    Task DeleteOrderImageIfUnusedAsync(string? imageUrl, string sellerId, string currentProductId);

    /// <summary>Bir siparişin kusur (defect) görselini, başka yerde kullanılmıyorsa siler.</summary>
    Task DeleteDefectImageIfUnusedAsync(string? imageUrl, string sellerId, string currentProductId);

    /// <summary>Bir katalog ürününün görselini, başka katalog/sipariş kaydında kullanılmıyorsa siler.</summary>
    Task DeleteCatalogImageIfUnusedAsync(string? imageUrl, string sellerId, string currentCatalogProductId);
}
