using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace GoodTrack.API.Abstractions.Services;

/// <summary>
/// Kullanıcılara gerçek zamanlı (SignalR) bildirim gönderimi. Bildirim hatası
/// ana iş akışını bozmaz (implementasyon hataları yutar ve loglar).
/// </summary>
public interface INotificationService
{
    /// <summary>
    /// Kullanıcılara <paramref name="method"/> olayını gönderir. <paramref name="payload"/> verilirse
    /// olayla birlikte iletilir (ör. güncellenen sipariş id'si), böylece istemci tam-liste yenilemek
    /// yerine yalnız o kaydı çekip cache'i yamalayabilir.
    /// </summary>
    Task NotifyUsersAsync(IReadOnlyList<string> userIds, string method, object? payload = null, CancellationToken cancellationToken = default);
}
