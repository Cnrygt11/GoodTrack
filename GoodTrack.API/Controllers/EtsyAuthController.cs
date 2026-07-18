using GoodTrack.API.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Common;
using GoodTrack.API.DTOs.Etsy;
using Microsoft.AspNetCore.Http;

namespace GoodTrack.API.Controllers;

[Authorize]
public class EtsyAuthController : BaseApiController
{
    private readonly IEtsyService _etsyService;
    private readonly ILogger<EtsyAuthController> _logger;
    private readonly IConfiguration _configuration;

    public EtsyAuthController(
        IEtsyService etsyService,
        ILogger<EtsyAuthController> logger,
        IConfiguration configuration)
    {
        _etsyService = etsyService;
        _logger = logger;
        _configuration = configuration;
    }

    /// <summary>Platform düzeyindeki Etsy API anahtarlarını okur.</summary>
    private (string Keystring, string SharedSecret) GetPlatformCredentials()
    {
        var keystring = _configuration["Etsy:Keystring"] ?? Environment.GetEnvironmentVariable("ETSY_KEYSTRING") ?? string.Empty;
        var sharedSecret = _configuration["Etsy:SharedSecret"] ?? Environment.GetEnvironmentVariable("ETSY_SHARED_SECRET") ?? string.Empty;
        return (keystring, sharedSecret);
    }

    /// <summary>
    /// <paramref name="url"/>'in origin'i izin verilen listede mi? Beyaz liste, CORS ile aynı
    /// kaynaktan okunur (<c>Cors:AllowedOrigins</c> config + <c>CORS_ALLOWED_ORIGINS</c> env).
    /// Liste boşsa (geliştirme) yalnız localhost'a izin verilir.
    /// </summary>
    private bool IsAllowedRedirectTarget(string url)
    {
        var allowed = new List<string>();
        var configOrigins = _configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        if (configOrigins != null) allowed.AddRange(configOrigins);

        var envOrigins = Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS");
        if (!string.IsNullOrEmpty(envOrigins))
        {
            allowed.AddRange(envOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
        }

        return Services.RedirectValidation.IsOriginAllowed(url, allowed);
    }

    /// <summary>
    /// Initiates the Etsy OAuth connection flow by generating the authorization URL.
    /// </summary>
    /// <param name="dto">The callback and frontend URL payload.</param>
    /// <returns>The OAuth URL inside an ApiResponse wrapper.</returns>
    [HttpPost("connect")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Connect([FromBody] ConnectRequestDto dto, CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var userId, out var authError)) return authError;

        var (keystring, sharedSecret) = GetPlatformCredentials();
        if (string.IsNullOrEmpty(keystring) || string.IsNullOrEmpty(sharedSecret))
        {
            return BadRequest(ApiResponse.Fail("Etsy bağlantısı henüz yapılandırılmamış. Lütfen sistem yöneticinizle iletişime geçin."));
        }

        if (string.IsNullOrWhiteSpace(dto.CallbackUrl) || string.IsNullOrWhiteSpace(dto.FrontendUrl))
        {
            return BadRequest(ApiResponse.Fail("Eksik parametre. CallbackUrl ve FrontendUrl zorunludur."));
        }

        // Açık-yönlendirme (open redirect) koruması: FrontendUrl OAuth dönüşünde tarayıcının
        // yönlendirileceği adrestir. Yalnız izin verilen origin'lere (CORS beyaz listesi + yerel
        // geliştirme) izin verilir; başka bir host reddedilir. CallbackUrl'ü Etsy zaten kayıtlı
        // redirect_uri'lere karşı doğrular.
        if (!IsAllowedRedirectTarget(dto.FrontendUrl))
        {
            _logger.LogWarning("Rejected Etsy connect with disallowed FrontendUrl: {Url}", dto.FrontendUrl);
            return BadRequest(ApiResponse.Fail("Geçersiz yönlendirme adresi."));
        }

        // State (code_verifier + frontend url dahil) kalıcı depoya yazılır; tek kaynak-of-truth.
        var oauthUrl = await _etsyService.GenerateOAuthUrlAsync(userId, keystring, dto.CallbackUrl, dto.FrontendUrl, cancellationToken);

        return Ok(new ApiResponse<object>(new { oauthUrl }));
    }

    [AllowAnonymous]
    [HttpGet("callback")]
    public async Task<IActionResult> Callback([FromQuery] string code, [FromQuery] string state, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Received Etsy OAuth callback. State: {State}", state);

        if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
        {
            return BadRequest("Eksik OAuth geri dönüş parametreleri.");
        }

        // State'i tek kullanımlık olarak tüket. Kullanıcı, code_verifier, callback ve
        // frontend adresi tek bir kayıttan gelir (eskiden iki ayrı in-memory sözlükteydi).
        var pending = await _etsyService.ConsumeOAuthStateAsync(state, cancellationToken);
        if (pending == null)
        {
            _logger.LogError("Invalid or expired Etsy OAuth state: {State}", state);
            return BadRequest("Geçersiz veya süresi dolmuş istek (state eşleşmedi).");
        }

        var (keystring, sharedSecret) = GetPlatformCredentials();
        if (string.IsNullOrEmpty(keystring) || string.IsNullOrEmpty(sharedSecret))
        {
            _logger.LogError("Etsy platform credentials are not configured; cannot complete OAuth callback.");
            return BuildRedirect(pending.FrontendUrl, "etsy_connected=false&error=" + Uri.EscapeDataString("Etsy API anahtarları yapılandırılmamış."));
        }

        try
        {
            var connection = await _etsyService.ExchangeCodeForTokensAsync(
                pending.UserId,
                keystring,
                sharedSecret,
                code,
                pending.CodeVerifier,
                pending.CallbackUrl,
                cancellationToken);

            _logger.LogInformation("Etsy connection successful. Redirecting user to frontend: {Url}", pending.FrontendUrl);

            return BuildRedirect(pending.FrontendUrl,
                $"etsy_connected=true&shop_name={Uri.EscapeDataString(connection.EtsyShopName)}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to complete Etsy OAuth connection.");

            return BuildRedirect(pending.FrontendUrl,
                $"etsy_connected=false&error={Uri.EscapeDataString(ex.Message)}");
        }
    }

    private RedirectResult BuildRedirect(string frontendUrl, string query)
    {
        var separator = frontendUrl.Contains('?') ? "&" : "?";
        return Redirect($"{frontendUrl}{separator}{query}");
    }
}
