using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Collections.Concurrent;
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

    // OAuth callback eşleştirmesi için geçici hafıza
    private static readonly ConcurrentDictionary<string, string> StateToFrontendUrl = new();

    public EtsyAuthController(
        IEtsyService etsyService,
        ILogger<EtsyAuthController> logger,
        IConfiguration configuration)
    {
        _etsyService = etsyService;
        _logger = logger;
        _configuration = configuration;
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
    public IActionResult Connect([FromBody] ConnectRequestDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
        }

        // Platform düzeyindeki Etsy API anahtarlarını oku
        var keystring = _configuration["Etsy:Keystring"] ?? Environment.GetEnvironmentVariable("ETSY_KEYSTRING") ?? string.Empty;
        var sharedSecret = _configuration["Etsy:SharedSecret"] ?? Environment.GetEnvironmentVariable("ETSY_SHARED_SECRET") ?? string.Empty;

        // Geriye uyumluluk veya lokal test için DTO'dan gelen değerleri de kontrol et
        if (string.IsNullOrEmpty(keystring)) keystring = dto.Keystring;
        if (string.IsNullOrEmpty(sharedSecret)) sharedSecret = dto.SharedSecret;

        if (string.IsNullOrEmpty(keystring) || string.IsNullOrEmpty(sharedSecret))
        {
            return BadRequest(ApiResponse.Fail("Sistem Etsy API anahtarları yapılandırılmamış. Lütfen sistem yöneticinizle iletişime geçin."));
        }

        if (string.IsNullOrWhiteSpace(dto.CallbackUrl) || string.IsNullOrWhiteSpace(dto.FrontendUrl))
        {
            return BadRequest(ApiResponse.Fail("Eksik parametre. CallbackUrl ve FrontendUrl zorunludur."));
        }

        // OAuth URL üret
        string codeVerifier;
        var oauthUrl = _etsyService.GenerateOAuthUrl(userId, keystring, sharedSecret, dto.CallbackUrl, out codeVerifier);

        // State değerini URL'den çıkar ve frontend URL'i ile eşleştir
        var uri = new Uri(oauthUrl);
        var queryParams = System.Web.HttpUtility.ParseQueryString(uri.Query);
        var state = queryParams["state"];

        if (!string.IsNullOrEmpty(state))
        {
            StateToFrontendUrl[state] = dto.FrontendUrl;
            // code_verifier bilgisini de bu state ile ilişkilendirilmiş şekilde EtsyService içinde saklıyoruz
            _logger.LogInformation("Stored state mapping. State: {State}, FrontendUrl: {FrontendUrl}", state, dto.FrontendUrl);
        }

        return Ok(new ApiResponse<object>(new { oauthUrl }));
    }

    [AllowAnonymous]
    [HttpGet("callback")]
    public async Task<IActionResult> Callback([FromQuery] string code, [FromQuery] string state, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Received Etsy OAuth callback. Code: {Code}, State: {State}", code, state);

        if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
        {
            return BadRequest("Eksik OAuth geri dönüş parametreleri.");
        }

        // State'e karşılık gelen frontend yönlendirme adresini al
        if (!StateToFrontendUrl.TryRemove(state, out var frontendUrl))
        {
            _logger.LogError("Invalid or expired state: {State}", state);
            return BadRequest("Geçersiz veya süresi dolmuş istek (state eşleşmedi).");
        }

        // State üzerinden bekleyen OAuth bağlantısını çözüp token takasını gerçekleştir.
        // (Bekleyen state -> code_verifier eşlemesi servis katmanında tutulur.)
        try
        {
            var connection = await _etsyService.ExchangeStateForTokensAsync(state, code, cancellationToken);

            _logger.LogInformation("Etsy connection successful. Redirecting user to frontend: {Url}", frontendUrl);

            // Başarılı yönlendirme
            var redirectUrl = frontendUrl.Contains("?")
                ? $"{frontendUrl}&etsy_connected=true&shop_name={Uri.EscapeDataString(connection.EtsyShopName)}"
                : $"{frontendUrl}?etsy_connected=true&shop_name={Uri.EscapeDataString(connection.EtsyShopName)}";

            return Redirect(redirectUrl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to complete Etsy OAuth connection.");

            // Hatalı yönlendirme
            var errorRedirectUrl = frontendUrl.Contains("?")
                ? $"{frontendUrl}&etsy_connected=false&error={Uri.EscapeDataString(ex.Message)}"
                : $"{frontendUrl}?etsy_connected=false&error={Uri.EscapeDataString(ex.Message)}";

            return Redirect(errorRedirectUrl);
        }
    }
}
