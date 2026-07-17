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
            await _etsyService.SyncRecentOrdersAsync(userId, cancellationToken);
            return Ok(ApiResponse.Ok("Etsy üzerindeki son ödenmiş siparişleriniz başarıyla tarandı ve panele aktarıldı."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Orders sync failed for user {UserId}", userId);
            return BadRequest(ApiResponse.Fail($"Sipariş eşitleme başarısız oldu: {ex.Message}"));
        }
    }

    [HttpPost("webhook/test-mock")]
    public async Task<IActionResult> TestMockWebhook([FromBody] MockWebhookRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        if (request == null || request.MockReceipt == null || request.MockReceipt.Transactions == null)
        {
            return BadRequest(ApiResponse.Fail("Eksik veya geçersiz mock sipariş verisi."));
        }

        _logger.LogInformation("Processing test mock webhook for user {UserId}, Receipt: {ReceiptId}", userId, request.MockReceipt.ReceiptId);

        try
        {
            var sellerUser = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);
            var sellerUsername = sellerUser?.Username ?? "Etsy Satıcı";

            var createdCount = 0;

            foreach (var transaction in request.MockReceipt.Transactions)
            {
                // Kataloğumuzdaki tüm ürünleri hafızaya çekip in-memory olarak eşleştirelim (SKU desteği için)
                var allProducts = await _context.CatalogProducts
                    .Where(p => p.SellerId == userId)
                    .ToListAsync(cancellationToken);

                var catalogProduct = allProducts.FirstOrDefault(p =>
                    p.ProductCode == $"etsy-{transaction.ListingId}" ||
                    p.ProductCode == transaction.ListingId.ToString() ||
                    (p.Extras != null && p.Extras.TryGetValue("etsy_listing_id", out var val) && val.Value == transaction.ListingId.ToString()));

                if (catalogProduct == null)
                {
                    return BadRequest(ApiResponse.Fail(
                        $"Listing ID '{transaction.ListingId}' veya eşleşen SKU'ya sahip ürün GoodTrack kataloğunda bulunamadı. " +
                        $"Lütfen önce Etsy ürünlerini kataloğa çekip bu ürüne üretici atayınız."));
                }

                if (string.IsNullOrEmpty(catalogProduct.ManufacturerId))
                {
                    return BadRequest(ApiResponse.Fail(
                        $"Katalogdaki '{catalogProduct.ProductCode}' kodlu test ürününe henüz üretici atanmamış. " +
                        $"Lütfen katalog sayfasından üretici atayınız."));
                }

                var transactionKey = transaction.TransactionId != 0 ? transaction.TransactionId : transaction.ListingId;
                var orderCode = catalogProduct.ProductCode;

                // Zaten var mı kontrol et (Duplicate prevention — transaction bazlı)
                var existingOrder = await _context.Products.FirstOrDefaultAsync(
                    p => p.SellerId == userId && p.EtsyTransactionId == transactionKey, cancellationToken);
                if (existingOrder != null)
                {
                    continue;
                }

                // Varyasyonları ve kişiselleştirmeyi 'extras' alanına ekle.
                // Gerçek Etsy JSON'u yapıştırılabildiği için değerler HTML-decode edilir
                // (ör. "Buyer&#39;s Note" → "Buyer's Note", "26&quot;" → 26").
                var extras = new Dictionary<string, ExtraValue>();

                if (transaction.Variations != null)
                {
                    foreach (var variation in transaction.Variations)
                    {
                        var name = Decode(variation.FormattedName);
                        extras[name] = new ExtraValue
                        {
                            Name = name,
                            Type = "text",
                            Value = Decode(variation.FormattedValue)
                        };
                    }
                }

                if (!string.IsNullOrEmpty(transaction.Personalization))
                {
                    extras["Kişiselleştirme"] = new ExtraValue
                    {
                        Name = "Kişiselleştirme",
                        Type = "text",
                        Value = Decode(transaction.Personalization)
                    };
                }

                // Etsy sipariş no / müşteri adı / adres artık extras'ta değil, ayrı alanlarda tutulur.
                var addressParts = new[]
                {
                    Decode($"{request.MockReceipt.FirstLine} {request.MockReceipt.SecondLine}".Trim()),
                    Decode(request.MockReceipt.City),
                    Decode(request.MockReceipt.CountryIso)
                };

                var createProductDto = new CreateProductDto
                {
                    Code = orderCode,
                    Image = catalogProduct.Image,
                    ThumbnailImage = catalogProduct.ThumbnailImage ?? catalogProduct.Image,
                    Text = null,
                    Length = catalogProduct.Length,
                    Extras = extras,
                    Quantity = transaction.Quantity < 1 ? 1 : transaction.Quantity,
                    EtsyReceiptId = request.MockReceipt.ReceiptId,
                    EtsyTransactionId = transactionKey,
                    CustomerName = Decode(request.MockReceipt.Name),
                    ShippingAddress = string.Join(", ", addressParts.Where(p => !string.IsNullOrWhiteSpace(p))),
                    ManufacturerId = catalogProduct.ManufacturerId,
                    ManufacturerName = catalogProduct.ManufacturerName
                };

                await _productService.CreateOrderAsync(userId, sellerUsername, createProductDto);
                createdCount++;
            }

            if (createdCount == 0)
            {
                return Ok(ApiResponse.Ok("Sipariş zaten mevcuttu."));
            }

            return Ok(ApiResponse.Ok("Mock sipariş başarıyla GoodTrack paneline eklendi ve ilgili üreticiye otomatik sipariş olarak gönderildi."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process mock webhook for user {UserId}", userId);
            return StatusCode(500, ApiResponse.Fail($"Mock webhook işletilirken hata oluştu: {ex.Message}"));
        }
    }

    /// <summary>
    /// Etsy metin alanlarını HTML-decode eder. Gerçek akışta bu, EtsyApiClient içindeki
    /// HtmlDecodingStringConverter tarafından yapılır; mock uç noktası kendi DTO'larını
    /// model binding ile aldığı için burada ayrıca uygulanır.
    /// </summary>
    private static string Decode(string? value) => string.IsNullOrEmpty(value) ? string.Empty : WebUtility.HtmlDecode(value);

    // ── Mock Webhook DTO Tanımları ──────────────────────────────────────────

    public class MockWebhookRequest
    {
        [JsonPropertyName("event_type")]
        public string EventType { get; set; } = "order.paid";

        [JsonPropertyName("shop_id")]
        public string ShopId { get; set; } = string.Empty;

        [JsonPropertyName("mock_receipt")]
        public MockReceipt MockReceipt { get; set; } = new();
    }

    public class MockReceipt
    {
        [JsonPropertyName("receipt_id")]
        public long ReceiptId { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("first_line")]
        public string FirstLine { get; set; } = string.Empty;

        [JsonPropertyName("second_line")]
        public string SecondLine { get; set; } = string.Empty;

        [JsonPropertyName("city")]
        public string City { get; set; } = string.Empty;

        [JsonPropertyName("country_iso")]
        public string CountryIso { get; set; } = string.Empty;

        [JsonPropertyName("transactions")]
        public List<MockTransaction> Transactions { get; set; } = new();
    }

    public class MockTransaction
    {
        [JsonPropertyName("transaction_id")]
        public long TransactionId { get; set; }

        [JsonPropertyName("listing_id")]
        public long ListingId { get; set; }

        [JsonPropertyName("quantity")]
        public int Quantity { get; set; }

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("variations")]
        public List<MockVariation>? Variations { get; set; }

        [JsonPropertyName("personalization")]
        public string? Personalization { get; set; }
    }

    public class MockVariation
    {
        [JsonPropertyName("formatted_name")]
        public string FormattedName { get; set; } = string.Empty;

        [JsonPropertyName("formatted_value")]
        public string FormattedValue { get; set; } = string.Empty;
    }
}
