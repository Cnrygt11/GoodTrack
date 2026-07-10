namespace GoodTrack.API.DTOs.Etsy;

/// <summary>
/// Etsy bağlantı akışını başlatma isteği. API anahtarları BİLİNÇLİ olarak burada yer almaz;
/// platform düzeyinde yapılandırmadan (Etsy:Keystring / Etsy:SharedSecret) okunur.
/// </summary>
public class ConnectRequestDto
{
    public string CallbackUrl { get; set; } = string.Empty;
    public string FrontendUrl { get; set; } = string.Empty;
}
