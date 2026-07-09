namespace GoodTrack.API.Abstractions.Services;

/// <summary>
/// Etsy OAuth 2.0 (PKCE) akışının URL üretimi ve bekleyen bağlantı durumunun yönetimi.
/// </summary>
public interface IEtsyOAuthService
{
    /// <summary>
    /// PKCE code verifier/challenge üretir, bekleyen bağlantı durumunu kaydeder ve
    /// Etsy authorization URL'ini döndürür.
    /// </summary>
    string GenerateOAuthUrl(string userId, string keystring, string sharedSecret, string redirectUri, out string codeVerifier);

    /// <summary>
    /// Verilen state için bekleyen bağlantı durumunu (varsa) döndürür ve kayıttan siler.
    /// </summary>
    PendingConnectionState? ConsumePendingConnection(string state);
}

/// <summary>
/// OAuth callback dönene kadar tutulan geçici bağlantı bağlamı.
/// </summary>
public sealed class PendingConnectionState
{
    public string UserId { get; set; } = string.Empty;
    public string Keystring { get; set; } = string.Empty;
    public string SharedSecret { get; set; } = string.Empty;
    public string CodeVerifier { get; set; } = string.Empty;
    public string CallbackUrl { get; set; } = string.Empty;
    public System.DateTime CreatedAt { get; set; }
}
