using System.Threading.Tasks;

namespace GoodTrack.API.Abstractions.Services;

public interface IOrderWorkflowService
{
    Task UpdateOrderStatusAsync(string userId, string role, string orderId, string newStatus, string? defectNote = null, string? defectImage = null);
    Task RequestOrderCancellationAsync(string sellerId, string orderId);
    Task RespondToOrderCancellationAsync(string mfrId, string orderId, bool approve);

    /// <summary>
    /// Dış kaynaklı (ör. Etsy) bir iptalin GoodTrack siparişine uygulanması.
    /// Üretim öncesi durumdaysa sipariş doğrudan iptal edilir; üretimdeyse üreticiye
    /// iptal talebi oluşturulur; üretim sonrasıysa yalnızca bilgilendirme kaydı düşülür.
    /// Uygulama içi iptalin aksine kredi iadesi yapılmaz. İdempotenttir.
    /// </summary>
    Task<ExternalCancellationOutcome> ApplyExternalCancellationAsync(string sellerId, string orderId, string reason);
}

public enum ExternalCancellationOutcome
{
    /// <summary>Sipariş üretim öncesindeydi; doğrudan iptal edildi.</summary>
    Cancelled,
    /// <summary>Sipariş üretimdeydi; üreticiye iptal talebi gönderildi.</summary>
    CancellationRequested,
    /// <summary>Sipariş üretimdeydi ve zaten aktif bir iptal talebi vardı.</summary>
    CancellationAlreadyRequested,
    /// <summary>Sipariş zaten iptal edilmişti; işlem yapılmadı.</summary>
    AlreadyCancelled,
    /// <summary>Sipariş üretim sürecinde ilerlemişti; otomatik iptal edilemedi, manuel inceleme gerekir.</summary>
    RequiresManualReview
}
