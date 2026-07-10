using System.Threading;
using System.Threading.Tasks;

namespace GoodTrack.API.Abstractions.Services;

/// <summary>
/// Etsy OAuth 2.0 (PKCE) akışının URL üretimi ve bekleyen bağlantı durumunun yönetimi.
/// Durum kalıcı depoda (DB) tutulur; çok instance'lı dağıtım ve yeniden başlatma güvenlidir.
/// </summary>
public interface IEtsyOAuthService
{
    /// <summary>
    /// PKCE code verifier/challenge üretir, bekleyen bağlantı durumunu kalıcı olarak kaydeder
    /// ve Etsy authorization URL'ini döndürür. Süresi dolmuş kayıtları fırsatçı olarak temizler.
    /// </summary>
    Task<string> GenerateOAuthUrlAsync(
        string userId,
        string keystring,
        string callbackUrl,
        string frontendUrl,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Verilen state için bekleyen bağlantı durumunu döndürür ve tek kullanımlık olarak tüketir.
    /// Bulunamaz veya süresi dolmuşsa <c>null</c> döner.
    /// </summary>
    Task<PendingConnectionState?> ConsumePendingConnectionAsync(string state, CancellationToken cancellationToken = default);
}

/// <summary>
/// OAuth callback dönene kadar tutulan geçici bağlantı bağlamı.
/// Etsy API anahtarları burada TUTULMAZ; callback sırasında yapılandırmadan okunur.
/// </summary>
public sealed class PendingConnectionState
{
    public string UserId { get; set; } = string.Empty;
    public string CodeVerifier { get; set; } = string.Empty;
    public string CallbackUrl { get; set; } = string.Empty;
    public string FrontendUrl { get; set; } = string.Empty;
}
