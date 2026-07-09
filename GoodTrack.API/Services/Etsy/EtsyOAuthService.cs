using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;

namespace GoodTrack.API.Services.Etsy;

/// <summary>
/// Etsy OAuth (PKCE) URL üretimi ve bekleyen bağlantı state yönetimi.
/// State kayıtları şimdilik in-memory tutulur (tek instance varsayımı); çok instance'lı
/// dağıtımda kalıcı/paylaşımlı bir depoya (DB/cache) taşınmalıdır.
/// </summary>
public sealed class EtsyOAuthService : IEtsyOAuthService
{
    private static readonly ConcurrentDictionary<string, PendingConnectionState> PendingConnections = new();

    private static readonly TimeSpan PendingStateTtl = TimeSpan.FromMinutes(15);

    private readonly ILogger<EtsyOAuthService> _logger;

    public EtsyOAuthService(ILogger<EtsyOAuthService> logger)
    {
        _logger = logger;
    }

    public string GenerateOAuthUrl(string userId, string keystring, string sharedSecret, string redirectUri, out string codeVerifier)
    {
        codeVerifier = GenerateCodeVerifier();
        var codeChallenge = GenerateCodeChallenge(codeVerifier);
        var state = Guid.NewGuid().ToString("N");

        PurgeExpiredStates();

        PendingConnections[state] = new PendingConnectionState
        {
            UserId = userId,
            Keystring = keystring,
            SharedSecret = sharedSecret,
            CodeVerifier = codeVerifier,
            CallbackUrl = redirectUri,
            CreatedAt = DateTime.UtcNow
        };

        _logger.LogInformation("Generating Etsy OAuth URL for User {UserId} with state {State}", userId, state);

        var scope = Uri.EscapeDataString("transactions_r shops_r listings_r");
        return "https://www.etsy.com/oauth/connect?" +
               "response_type=code" +
               $"&client_id={keystring}" +
               $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
               $"&scope={scope}" +
               $"&state={state}" +
               $"&code_challenge={codeChallenge}" +
               "&code_challenge_method=S256";
    }

    public PendingConnectionState? ConsumePendingConnection(string state)
    {
        return PendingConnections.TryRemove(state, out var pending) ? pending : null;
    }

    private static void PurgeExpiredStates()
    {
        var now = DateTime.UtcNow;
        var expiredKeys = PendingConnections
            .Where(kvp => now - kvp.Value.CreatedAt > PendingStateTtl)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in expiredKeys)
        {
            PendingConnections.TryRemove(key, out _);
        }
    }

    private static string GenerateCodeVerifier()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Base64UrlEncode(bytes);
    }

    private static string GenerateCodeChallenge(string codeVerifier)
    {
        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(Encoding.ASCII.GetBytes(codeVerifier));
        return Base64UrlEncode(hash);
    }

    private static string Base64UrlEncode(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}
