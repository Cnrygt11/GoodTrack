using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System;
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
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
        }

        var (keystring, sharedSecret) = GetPlatformCredentials();
        if (string.IsNullOrEmpty(keystring) || string.IsNullOrEmpty(sharedSecret))
        {
            return BadRequest(ApiResponse.Fail("Sistem Etsy API anahtarları yapılandırılmamış. Lütfen sistem yöneticinizle iletişime geçin."));
        }

        if (string.IsNullOrWhiteSpace(dto.CallbackUrl) || string.IsNullOrWhiteSpace(dto.FrontendUrl))
        {
            return BadRequest(ApiResponse.Fail("Eksik parametre. CallbackUrl ve FrontendUrl zorunludur."));
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
