using System;
using Microsoft.Extensions.Configuration;

namespace GoodTrack.API.Configuration;

/// <summary>Etsy platform (uygulama) düzeyi yapılandırma çözümlemelerinin tek kaynağı.</summary>
public static class EtsySettings
{
    /// <summary>
    /// Platform düzeyi webhook signing secret (commercial mod). Tanımlı değilse null döner;
    /// çağıranlar bu durumda mağaza-başı secret'a düşer.
    /// </summary>
    public static string? ResolvePlatformSigningSecret(IConfiguration configuration)
    {
        var secret = configuration["Etsy:WebhookSigningSecret"]
            ?? Environment.GetEnvironmentVariable("ETSY_WEBHOOK_SIGNING_SECRET");
        return string.IsNullOrWhiteSpace(secret) ? null : secret;
    }
}
