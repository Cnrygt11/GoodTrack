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
    Task NotifyUsersAsync(IReadOnlyList<string> userIds, string method, CancellationToken cancellationToken = default);
}
