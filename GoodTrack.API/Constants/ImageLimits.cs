namespace GoodTrack.API.Constants;

/// <summary>
/// Görsel boyut limitlerinin tek kaynağı. Model [MaxLength] öznitelikleri, DTO'lar ve
/// servis doğrulamaları aynı sabitleri kullanır; limit değişikliği tek yerden yapılır.
/// </summary>
public static class ImageLimits
{
    /// <summary>Tam görsel base64 üst sınırı (~5MB binary karşılığı).</summary>
    public const int MaxBase64Length = 7_000_000;

    /// <summary>Liste/kart thumbnail'i (~160px) base64 üst sınırı.</summary>
    public const int MaxThumbnailBase64Length = 500_000;
}
