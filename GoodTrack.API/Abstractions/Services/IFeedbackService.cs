using System.Threading;
using System.Threading.Tasks;

namespace GoodTrack.API.Abstractions.Services;

public interface IFeedbackService
{
    /// <summary>
    /// Kullanıcı geri bildirimini kaydeder ve kullanıcıya gösterilecek başarı mesajını döndürür.
    /// </summary>
    Task<string> SubmitFeedbackAsync(string userId, string title, string message, string? browserInfo, CancellationToken cancellationToken = default);
}
