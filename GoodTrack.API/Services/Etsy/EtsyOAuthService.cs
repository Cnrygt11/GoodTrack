using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Models;

namespace GoodTrack.API.Services.Etsy;

/// <summary>
/// Etsy OAuth (PKCE) URL üretimi ve bekleyen bağlantı state yönetimi.
/// State kayıtları kalıcı depoda (etsy_oauth_states) tutulur: yeniden başlatma ve
/// çok instance'lı dağıtım güvenlidir, süresi dolan kayıtlar temizlenir.
/// </summary>
public sealed class EtsyOAuthService : IEtsyOAuthService
{
    private static readonly TimeSpan PendingStateTtl = TimeSpan.FromMinutes(15);

    private readonly IEtsyOAuthStateRepository _stateRepository;
    private readonly ILogger<EtsyOAuthService> _logger;

    public EtsyOAuthService(IEtsyOAuthStateRepository stateRepository, ILogger<EtsyOAuthService> logger)
    {
        _stateRepository = stateRepository;
        _logger = logger;
    }

    public async Task<string> GenerateOAuthUrlAsync(
        string userId,
        string keystring,
        string callbackUrl,
        string frontendUrl,
        CancellationToken cancellationToken = default)
    {
        var codeVerifier = GenerateCodeVerifier();
        var codeChallenge = GenerateCodeChallenge(codeVerifier);
        var state = Guid.NewGuid().ToString("N");

        // Fırsatçı temizlik: ayrı bir arka plan servisi olmadan sızıntıyı önler.
        var purged = await _stateRepository.DeleteExpiredAsync(cancellationToken);
        if (purged > 0)
        {
            _logger.LogInformation("Purged {Count} expired Etsy OAuth state(s).", purged);
        }

        var now = DateTime.UtcNow;
        await _stateRepository.AddAsync(new EtsyOAuthState
        {
            State = state,
            UserId = userId,
            CodeVerifier = codeVerifier,
            CallbackUrl = callbackUrl,
            FrontendUrl = frontendUrl,
            CreatedAt = now,
            ExpiresAt = now.Add(PendingStateTtl)
        }, cancellationToken);

        _logger.LogInformation("Generating Etsy OAuth URL for User {UserId} with state {State}", userId, state);

        var scope = Uri.EscapeDataString("transactions_r shops_r listings_r");
        return "https://www.etsy.com/oauth/connect?" +
               "response_type=code" +
               $"&client_id={keystring}" +
               $"&redirect_uri={Uri.EscapeDataString(callbackUrl)}" +
               $"&scope={scope}" +
               $"&state={state}" +
               $"&code_challenge={codeChallenge}" +
               "&code_challenge_method=S256";
    }

    public async Task<PendingConnectionState?> ConsumePendingConnectionAsync(string state, CancellationToken cancellationToken = default)
    {
        var entity = await _stateRepository.ConsumeAsync(state, cancellationToken);
        if (entity == null)
        {
            return null;
        }

        return new PendingConnectionState
        {
            UserId = entity.UserId,
            CodeVerifier = entity.CodeVerifier,
            CallbackUrl = entity.CallbackUrl,
            FrontendUrl = entity.FrontendUrl
        };
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
