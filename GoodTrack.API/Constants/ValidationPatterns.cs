using System.Text.RegularExpressions;

namespace GoodTrack.API.Constants;

/// <summary>
/// Kullanıcı girdisi doğrulama regex'lerinin tek kaynağı (Auth + Profile aynı kuralları paylaşır).
/// [GeneratedRegex] ile derleme zamanında üretilir; her çağrıda yeniden derleme maliyeti yoktur.
/// </summary>
public static partial class ValidationPatterns
{
    /// <summary>Kullanıcı adı: a-z, 0-9, alt çizgi; 3-15 karakter.</summary>
    [GeneratedRegex("^[a-z0-9_]{3,15}$")]
    public static partial Regex Username();

    /// <summary>E-posta: nokta içeren alan adı, 2-6 karakter TLD; ardışık/başta/sonda nokta yok.</summary>
    [GeneratedRegex(@"^[a-zA-Z0-9]+(?:[._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,6}$")]
    public static partial Regex Email();

    /// <summary>Telefon: 10-20 karakter; rakam, boşluk, +, -, () serbest.</summary>
    [GeneratedRegex(@"^\+?[0-9\s\-()]{10,20}$")]
    public static partial Regex Phone();

    /// <summary>Şifre: 8-20 karakter; büyük/küçük harf, rakam ve özel karakter zorunlu.</summary>
    [GeneratedRegex(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#\-_])[A-Za-z\d@$!%*?&.#\-_]{8,20}$")]
    public static partial Regex Password();
}
