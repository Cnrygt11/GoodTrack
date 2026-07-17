namespace GoodTrack.API.DTOs.Etsy;

/// <summary>
/// Etsy sipariş senkronunun sonucu. Özellikle kredi yetersizliğinden atlanan siparişler
/// kullanıcıya bildirilir (önceden sessizce log'a yazılıp "başarılı" mesajı dönüyordu).
/// Atlanan siparişler kaybolmaz: duplicate kontrolü idempotent olduğundan kredi
/// yüklendikten sonraki senkron aynı siparişleri oluşturur.
/// </summary>
public sealed class EtsyOrderSyncResult
{
    /// <summary>Bu çalıştırmada oluşturulan sipariş sayısı.</summary>
    public int Created { get; set; }

    /// <summary>Kredi yetersizliğinden oluşturulamayan sipariş sayısı.</summary>
    public int SkippedInsufficientCredits { get; set; }

    public void Add(EtsyOrderSyncResult other)
    {
        Created += other.Created;
        SkippedInsufficientCredits += other.SkippedInsufficientCredits;
    }
}
