using System;

namespace GoodTrack.API.Models;

/// <summary>
/// OAuth callback dönene kadar saklanan, tek kullanımlık ve süreli bağlantı bağlamı.
/// Daha önce iki ayrı statik sözlükte (in-memory) tutuluyordu; çok instance'lı dağıtımda
/// ve yeniden başlatmada kayboluyor, ayrıca temizlenmediği için sızıntı yapıyordu.
///
/// Etsy API anahtarları (keystring/shared secret) BİLİNÇLİ olarak burada saklanmaz;
/// callback sırasında platform yapılandırmasından okunur.
/// </summary>
public class EtsyOAuthState
{
    /// <summary>CSRF/state token — birincil anahtar.</summary>
    public string State { get; set; } = string.Empty;

    public string UserId { get; set; } = string.Empty;

    /// <summary>PKCE code_verifier; token takasında gereklidir.</summary>
    public string CodeVerifier { get; set; } = string.Empty;

    /// <summary>Etsy'ye bildirilen redirect_uri; token takasında birebir aynısı gönderilmelidir.</summary>
    public string CallbackUrl { get; set; } = string.Empty;

    /// <summary>Akış bitince kullanıcının geri yönlendirileceği ön yüz adresi.</summary>
    public string FrontendUrl { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime ExpiresAt { get; set; }
}
