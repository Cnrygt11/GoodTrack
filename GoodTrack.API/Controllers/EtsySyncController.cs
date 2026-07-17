using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System;
using System.Collections.Generic;
using System.Net;
using Microsoft.Extensions.Configuration;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Models;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.DTOs.Common;
using GoodTrack.API.Constants;
using GoodTrack.API.DTOs.Etsy;

namespace GoodTrack.API.Controllers;

[Authorize(Roles = Roles.Seller)]
[EnableRateLimiting("api-general")]
public class EtsySyncController : BaseApiController
{
    private readonly AppDbContext _context;
    private readonly IEtsyService _etsyService;
    private readonly IProductService _productService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<EtsySyncController> _logger;

    public EtsySyncController(
        AppDbContext context,
        IEtsyService etsyService,
        IProductService productService,
        IConfiguration configuration,
        ILogger<EtsySyncController> logger)
    {
        _context = context;
        _etsyService = etsyService;
        _productService = productService;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Etsy webhook yapılandırma durumu. Platform (uygulama) düzeyinde bir signing secret
    /// tanımlıysa (commercial mod), satıcıların mağaza-başı manuel secret girmesine gerek yoktur;
    /// UI bu bilgiye göre manuel alanı gizler.
    /// </summary>
    [HttpGet("webhook-config")]
    public IActionResult GetWebhookConfig()
    {
        var platformSecret = _configuration["Etsy:WebhookSigningSecret"]
            ?? Environment.GetEnvironmentVariable("ETSY_WEBHOOK_SIGNING_SECRET");
        var platformConfigured = !string.IsNullOrWhiteSpace(platformSecret);

        return Ok(new ApiResponse<object>(new { platformConfigured }));
    }

    [HttpGet("connections")]
    public async Task<IActionResult> GetConnections(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        var connections = await _etsyService.GetConnectionsAsync(userId, cancellationToken);
        // Secret istemciye asla geri dönmez (yazılabilir, okunamaz — standart secret semantiği);
        // UI yalnız kayıtlı olup olmadığını bilir.
        var result = connections.Select(c => new
        {
            shopId = c.EtsyShopId,
            shopName = c.EtsyShopName,
            isActive = c.IsActive,
            tokenExpiresAt = c.TokenExpiresAt,
            hasWebhookSecret = !string.IsNullOrEmpty(c.WebhookSigningSecret)
        }).ToList();

        return Ok(new ApiResponse<object>(result));
    }

    [HttpPost("connection/webhook-secret")]
    public async Task<IActionResult> UpdateWebhookSecret([FromBody] UpdateWebhookSecretDto dto, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        if (string.IsNullOrEmpty(dto.EtsyShopId))
        {
            return BadRequest(ApiResponse.Fail("Mağaza bilgisi eksik."));
        }

        var connection = await _etsyService.GetConnectionAsync(userId, dto.EtsyShopId, cancellationToken);
        if (connection == null)
        {
            return BadRequest(ApiResponse.Fail("Belirtilen mağaza için aktif bir Etsy bağlantısı bulunamadı."));
        }

        connection.WebhookSigningSecret = dto.WebhookSigningSecret;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse.Ok("Bildirim imza anahtarı başarıyla güncellendi."));
    }

    [HttpPost("connection/disconnect")]
    public async Task<IActionResult> DisconnectShop([FromBody] DisconnectShopDto dto, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        if (string.IsNullOrEmpty(dto.EtsyShopId))
        {
            return BadRequest(ApiResponse.Fail("Mağaza bilgisi eksik."));
        }

        var connection = await _context.EtsyConnections
            .FirstOrDefaultAsync(c => c.UserId == userId && c.EtsyShopId == dto.EtsyShopId, cancellationToken);

        if (connection != null)
        {
            _context.EtsyConnections.Remove(connection);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Ok(ApiResponse.Ok("Etsy mağaza bağlantısı başarıyla kesildi."));
    }

    [HttpPost("sync-listings")]
    [EnableRateLimiting("etsy-sync")]
    public async Task<IActionResult> SyncListings(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        _logger.LogInformation("User {UserId} requested Etsy listings synchronization.", userId);

        try
        {
            var imported = await _etsyService.FetchAndImportEtsyListingsAsync(userId, cancellationToken);
            return Ok(new ApiResponse<object>(
                new { count = imported.Count },
                "Etsy mağazanızdaki ürünler başarıyla GoodTrack kataloğuna çekildi. Lütfen katalog sayfasından üretici atamalarını tamamlayınız."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Listings sync failed for user {UserId}", userId);
            return BadRequest(ApiResponse.Fail($"Ürün eşitleme başarısız oldu: {ex.Message}"));
        }
    }

    [HttpPost("sync-orders")]
    [EnableRateLimiting("etsy-sync")]
    public async Task<IActionResult> SyncOrders(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        _logger.LogInformation("User {UserId} requested Etsy orders synchronization.", userId);

        try
        {
            var result = await _etsyService.SyncRecentOrdersAsync(userId, cancellationToken);

            // Kredi yetersizliğinden atlanan siparişler kullanıcıya açıkça bildirilir;
            // atlananlar kaybolmaz, kredi yüklendikten sonra yeniden eşitleme onları oluşturur.
            string message = result.SkippedInsufficientCredits > 0
                ? $"{result.Created} sipariş aktarıldı; {result.SkippedInsufficientCredits} sipariş krediniz yetersiz olduğu için aktarılamadı. Kredi yükleyip tekrar eşitleyebilirsiniz."
                : "Etsy üzerindeki son ödenmiş siparişleriniz başarıyla tarandı ve panele aktarıldı.";

            return Ok(new ApiResponse<object>(
                new { created = result.Created, skippedInsufficientCredits = result.SkippedInsufficientCredits },
                message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Orders sync failed for user {UserId}", userId);
            return BadRequest(ApiResponse.Fail($"Sipariş eşitleme başarısız oldu: {ex.Message}"));
        }
    }

}
