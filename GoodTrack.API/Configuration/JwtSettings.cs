using System;
using Microsoft.Extensions.Configuration;

namespace GoodTrack.API.Configuration;

/// <summary>
/// JWT anahtar/issuer/audience çözümlemesinin tek kaynağı. Anahtar önce JWT_KEY
/// ortam değişkeninden, sonra Jwt:Key config'inden okunur (Render env var'ları
/// appsettings'i ezer; geliştirmede user-secrets kullanılır).
/// </summary>
public static class JwtSettings
{
    public const string DefaultIssuer = "GoodTrack.API";
    public const string DefaultAudience = "GoodTrack.Client";

    /// <summary>Anahtarı çözer; yapılandırılmamışsa null döner (çağıran kendi hatasını verir).</summary>
    public static string? TryResolveKey(IConfiguration configuration) =>
        Environment.GetEnvironmentVariable("JWT_KEY") ?? configuration["Jwt:Key"];

    /// <summary>Anahtarı çözer; yapılandırılmamışsa fırlatır.</summary>
    public static string ResolveKey(IConfiguration configuration) =>
        TryResolveKey(configuration)
        ?? throw new InvalidOperationException(
            "JWT signing key is not configured. Set 'JWT_KEY' environment variable or 'Jwt:Key' in appsettings.json.");

    public static string ResolveIssuer(IConfiguration configuration) =>
        configuration["Jwt:Issuer"] ?? DefaultIssuer;

    public static string ResolveAudience(IConfiguration configuration) =>
        configuration["Jwt:Audience"] ?? DefaultAudience;
}
