using System;

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

    /// <summary>Base64 görsel üst sınırı aşarsa kullanıcı-dostu mesajla fırlatır.</summary>
    public static void ValidateImageSize(string? base64Image, string fieldName = "Görsel")
    {
        if (!string.IsNullOrEmpty(base64Image) && base64Image.Length > MaxBase64Length)
        {
            throw new ArgumentException(Messages.Image.TooLarge(fieldName));
        }
    }
}
