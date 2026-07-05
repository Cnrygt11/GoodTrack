using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Collections.Generic;
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

namespace GoodTrack.API.Controllers;

[Authorize(Roles = Roles.Seller)]
public class EtsySyncController : BaseApiController
{
    private readonly AppDbContext _context;
    private readonly IEtsyService _etsyService;
    private readonly IProductService _productService;
    private readonly ILogger<EtsySyncController> _logger;

    public EtsySyncController(
        AppDbContext context,
        IEtsyService etsyService,
        IProductService productService,
        ILogger<EtsySyncController> logger)
    {
        _context = context;
        _etsyService = etsyService;
        _productService = productService;
        _logger = logger;
    }

    [HttpGet("connection")]
    public async Task<IActionResult> GetConnection(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
        }

        var connection = await _etsyService.GetConnectionAsync(userId, cancellationToken);
        if (connection == null || !connection.IsActive)
        {
            return Ok(new ApiResponse<object?>(null));
        }

        return Ok(new ApiResponse<object>(new { 
            shopId = connection.EtsyShopId, 
            shopName = connection.EtsyShopName,
            isActive = connection.IsActive,
            tokenExpiresAt = connection.TokenExpiresAt,
            webhookSigningSecret = connection.WebhookSigningSecret
        }));
    }

    [HttpPost("connection/webhook-secret")]
    public async Task<IActionResult> UpdateWebhookSecret([FromBody] UpdateWebhookSecretDto dto, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
        }

        var connection = await _etsyService.GetConnectionAsync(userId, cancellationToken);
        if (connection == null)
        {
            return BadRequest(ApiResponse.Fail("Aktif bir Etsy bağlantısı bulunamadı."));
        }

        connection.WebhookSigningSecret = dto.WebhookSigningSecret;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse.Ok("Webhook imza anahtarı başarıyla güncellendi."));
    }

    public class UpdateWebhookSecretDto
    {
        public string? WebhookSigningSecret { get; set; }
    }

    [HttpPost("sync-listings")]
    public async Task<IActionResult> SyncListings(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
        }

        _logger.LogInformation("User {UserId} requested Etsy listings synchronization.", userId);

        try
        {
            var imported = await _etsyService.FetchAndImportEtsyListingsAsync(userId, cancellationToken);
            return Ok(new ApiResponse<object>(new { 
                count = imported.Count, 
                message = "Etsy mağazanızdaki ürünler başarıyla GoodTrack kataloğuna çekildi. Lütfen katalog sayfasından üretici atamalarını tamamlayınız." 
            }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Listings sync failed for user {UserId}", userId);
            return BadRequest(ApiResponse.Fail($"Ürün eşitleme başarısız oldu: {ex.Message}"));
        }
    }

    [HttpPost("sync-orders")]
    public async Task<IActionResult> SyncOrders(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
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
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
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
                var productCode = $"etsy-{transaction.ListingId}";

                // Kataloğumuzda bu ürünü bul
                var catalogProduct = await _context.CatalogProducts
                    .FirstOrDefaultAsync(p => p.SellerId == userId && p.ProductCode == productCode, cancellationToken);

                if (catalogProduct == null)
                {
                    return BadRequest(ApiResponse.Fail(
                        $"Listing ID '{transaction.ListingId}' GoodTrack kataloğunda bulunamadı. " +
                        $"Lütfen önce Etsy ürünlerini kataloğa çekip bu Listing ID'sine sahip ürüne üretici atayınız."));
                }

                if (string.IsNullOrEmpty(catalogProduct.ManufacturerId))
                {
                    return BadRequest(ApiResponse.Fail(
                        $"Katalogdaki '{productCode}' kodlu test ürününe henüz üretici atanmamış. " +
                        $"Lütfen katalog sayfasından üretici atayınız."));
                }

                var orderCode = $"etsy-mock-{request.MockReceipt.ReceiptId}-{transaction.ListingId}";

                // Zaten var mı kontrol et (Duplicate prevention)
                var existingOrder = await _context.Products.FirstOrDefaultAsync(p => p.Code == orderCode && p.SellerId == userId, cancellationToken);
                if (existingOrder != null)
                {
                    continue;
                }

                // Varyasyonları ve kişiselleştirmeyi 'extras' alanına ekle
                var extras = new Dictionary<string, ExtraValue>();

                if (transaction.Variations != null)
                {
                    foreach (var variation in transaction.Variations)
                    {
                        extras[variation.FormattedName] = new ExtraValue
                        {
                            Name = variation.FormattedName,
                            Type = "text",
                            Value = variation.FormattedValue
                        };
                    }
                }

                if (!string.IsNullOrEmpty(transaction.Personalization))
                {
                    extras["Kişiselleştirme"] = new ExtraValue
                    {
                        Name = "Kişiselleştirme",
                        Type = "text",
                        Value = transaction.Personalization
                    };
                }

                extras["Etsy Sipariş No"] = new ExtraValue { Name = "Etsy Sipariş No", Type = "text", Value = request.MockReceipt.ReceiptId.ToString() };
                extras["Müşteri Adı"] = new ExtraValue { Name = "Müşteri Adı", Type = "text", Value = request.MockReceipt.Name };
                extras["Adres"] = new ExtraValue { Name = "Adres", Type = "text", Value = $"{request.MockReceipt.FirstLine} {request.MockReceipt.SecondLine}, {request.MockReceipt.City}, {request.MockReceipt.CountryIso}" };

                var createProductDto = new CreateProductDto
                {
                    Code = orderCode,
                    Image = catalogProduct.Image,
                    Text = transaction.Title,
                    Length = catalogProduct.Length,
                    Extras = extras,
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
        public int ReceiptId { get; set; }

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
        [JsonPropertyName("listing_id")]
        public int ListingId { get; set; }

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
