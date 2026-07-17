using System;
using System.Collections.Generic;
using System.Linq;

namespace GoodTrack.API.Services;

/// <summary>
/// Açık-yönlendirme (open redirect) koruması için origin beyaz-liste kontrolü. Saf/statik
/// tutulur ki birim testlerle doğrulanabilsin (bkz. RedirectValidationTests).
/// </summary>
public static class RedirectValidation
{
    /// <summary>
    /// <paramref name="url"/>'in origin'i (scheme://host[:port]) izin verilenler arasında mı?
    /// Yerel geliştirme (localhost / 127.0.0.1) her zaman kabul edilir. Geçersiz/mutlak-olmayan
    /// URL'ler reddedilir.
    /// </summary>
    public static bool IsOriginAllowed(string? url, IEnumerable<string> allowedOrigins)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            return false;
        }

        if (uri.Host is "localhost" or "127.0.0.1")
        {
            return true;
        }

        var target = uri.GetLeftPart(UriPartial.Authority);
        return allowedOrigins.Any(o =>
            Uri.TryCreate(o, UriKind.Absolute, out var allowedUri) &&
            string.Equals(allowedUri.GetLeftPart(UriPartial.Authority), target, StringComparison.OrdinalIgnoreCase));
    }
}
