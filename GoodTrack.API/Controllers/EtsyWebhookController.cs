using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.DTOs.Common;

namespace GoodTrack.API.Controllers;

[AllowAnonymous]
public class EtsyWebhookController : BaseApiController
{
    private readonly AppDbContext _context;
    private readonly IEtsyService _etsyService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<EtsyWebhookController> _logger;

    public EtsyWebhookController(
        AppDbContext context,
        IEtsyService etsyService,
        IConfiguration configuration,
        ILogger<EtsyWebhookController> logger)
    {
        _context = context;
        _etsyService = etsyService;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Etsy webhook aboneliği ve signing secret UYGULAMA (platform) düzeyindedir:
    /// commercial app'in webhook portalında bir kez tanımlanır ve tüm satıcıların
    /// webhook'ları bu tek secret ile imzalanır (payload'daki shop_id hangi satıcı
    /// olduğunu belirtir). Bu yüzden platform secret'ı önceliklidir.
    ///
    /// Geriye dönük uyum / personal access dönemi için, platform secret tanımlı
    /// değilse mağaza bazlı secret'a düşülür. Commercial'a geçişte tek yapılacak:
    /// Etsy:WebhookSigningSecret (veya ETSY_WEBHOOK_SIGNING_SECRET) değerini set etmek.
    /// </summary>
    private string? ResolvePlatformSigningSecret()
    {
        var secret = _configuration["Etsy:WebhookSigningSecret"]
            ?? Environment.GetEnvironmentVariable("ETSY_WEBHOOK_SIGNING_SECRET");
        return string.IsNullOrWhiteSpace(secret) ? null : secret;
    }

    [HttpPost("webhook")]
    public async Task<IActionResult> HandleWebhook(CancellationToken cancellationToken)
    {
        // 1. Gerekli başlıkları (headers) oku
        if (!Request.Headers.TryGetValue("webhook-id", out var webhookId) ||
            !Request.Headers.TryGetValue("webhook-timestamp", out var webhookTimestampStr) ||
            !Request.Headers.TryGetValue("webhook-signature", out var webhookSignature))
        {
            _logger.LogWarning("Missing required Etsy webhook headers.");
            return BadRequest("Eksik webhook başlıkları.");
        }

        // 2. Zaman damgasını (timestamp) doğrula (Replay attack önleme - 5 dakika sınırı)
        if (!long.TryParse(webhookTimestampStr, out var webhookTimestamp))
        {
            return BadRequest("Geçersiz webhook zaman damgası.");
        }

        var currentUnixTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (Math.Abs(currentUnixTime - webhookTimestamp) > 300)
        {
            _logger.LogWarning("Webhook timestamp is stale. Diff: {Diff}s", currentUnixTime - webhookTimestamp);
            return BadRequest("Zaman aşımına uğramış istek (Stale timestamp).");
        }

        // 3. İstek gövdesini (body) ham metin olarak oku
        string rawBody;
        using (var reader = new StreamReader(Request.Body, Encoding.UTF8))
        {
            rawBody = await reader.ReadToEndAsync(cancellationToken);
        }

        if (string.IsNullOrEmpty(rawBody))
        {
            return BadRequest("Boş istek gövdesi.");
        }

        // 4. Payload'u deserialize et
        EtsyWebhookPayload? payload;
        try
        {
            payload = JsonSerializer.Deserialize<EtsyWebhookPayload>(rawBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse webhook JSON payload.");
            return BadRequest("Geçersiz JSON formatı.");
        }

        if (payload == null || string.IsNullOrEmpty(payload.ShopId) || string.IsNullOrEmpty(payload.ResourceUrl))
        {
            return BadRequest("Eksik payload verileri.");
        }

        // 5. Bu ShopId'ye sahip aktif bağlantısı olan satıcıyı veri tabanından bul
        var etsyConnection = await _context.EtsyConnections
            .FirstOrDefaultAsync(c => c.EtsyShopId == payload.ShopId && c.IsActive, cancellationToken);

        if (etsyConnection == null)
        {
            _logger.LogWarning("Active Etsy connection not found for ShopId: {ShopId}. Webhook ignored.", payload.ShopId);
            return Ok(); // Etsy webhook'u iptal etmesin diye 200 döneriz.
        }

        // 6. İmzayı doğrula. Bu uç nokta [AllowAnonymous] olduğundan imza TEK koruma katmanıdır.
        //    Önce platform (uygulama) secret'ı, yoksa mağaza bazlı secret kullanılır.
        //    Hiçbiri yoksa istek ASLA işlenmez (güvenli varsayılan).
        var signingSecret = ResolvePlatformSigningSecret() ?? etsyConnection.WebhookSigningSecret;
        if (string.IsNullOrEmpty(signingSecret))
        {
            _logger.LogError(
                "No webhook signing secret available (neither platform-level Etsy:WebhookSigningSecret nor shop secret for ShopId: {ShopId}). Rejecting webhook — cannot verify authenticity.",
                payload.ShopId);
            return Unauthorized("Webhook imza anahtarı yapılandırılmamış.");
        }

        if (!VerifySignature(webhookId!, webhookTimestampStr!, rawBody, signingSecret, webhookSignature!))
        {
            _logger.LogWarning("Webhook signature verification failed for ShopId: {ShopId}", payload.ShopId);
            return Unauthorized("Geçersiz imza (Signature mismatch).");
        }

        // 7. Desteklenen olay tiplerini işle: order.paid (sipariş oluştur), order.canceled (sipariş iptal et).
        //    Etsy iptal olayı Amerikan yazımıyla "order.canceled" (tek 'l') gelir.
        var isPaid = payload.EventType.Equals("order.paid", StringComparison.OrdinalIgnoreCase);
        var isCanceled = payload.EventType.Equals("order.canceled", StringComparison.OrdinalIgnoreCase)
            || payload.EventType.Equals("order.cancelled", StringComparison.OrdinalIgnoreCase);

        if (!isPaid && !isCanceled)
        {
            _logger.LogInformation("Ignoring unsupported webhook event type: {EventType}", payload.EventType);
            return Ok();
        }

        try
        {
            // Resource URL'den sipariş (receipt) ID'sini çekelim. URL formatı:
            // https://api.etsy.com/v3/application/shops/{YOUR_SHOP_ID}/receipts/{RECEIPT_ID}
            var uri = new Uri(payload.ResourceUrl);
            var receiptId = uri.Segments[^1].TrimEnd('/');

            if (isPaid)
            {
                _logger.LogInformation("Webhook triggered order paid processing. ReceiptId: {ReceiptId} for Seller: {UserId}", receiptId, etsyConnection.UserId);
                var result = await _etsyService.ProcessEtsyOrderSyncAsync(etsyConnection.UserId, etsyConnection.EtsyShopId, receiptId, cancellationToken);

                // Kredi yetersizliğinden sipariş oluşturulamadıysa bilinçli olarak 500 dönülür:
                // Etsy başarısız teslimatları yeniden dener; satıcı kredi yükleyince sipariş
                // sonraki denemede (veya manuel eşitlemede) oluşur.
                if (result.SkippedInsufficientCredits > 0)
                {
                    _logger.LogWarning(
                        "Webhook order skipped due to insufficient credits; returning 500 so Etsy retries. Seller: {UserId}, Receipt: {ReceiptId}",
                        etsyConnection.UserId, receiptId);
                    return StatusCode(500, "Sipariş, satıcının kredisi yetersiz olduğu için oluşturulamadı.");
                }
            }
            else
            {
                _logger.LogInformation("Webhook triggered order cancellation processing. ReceiptId: {ReceiptId} for Seller: {UserId}", receiptId, etsyConnection.UserId);
                await _etsyService.ProcessEtsyOrderCancellationAsync(etsyConnection.UserId, etsyConnection.EtsyShopId, receiptId, cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing webhook order event {EventType}.", payload.EventType);
            return StatusCode(500, "Sipariş senkronizasyonu sırasında iç sunucu hatası oluştu.");
        }

        return Ok();
    }

    private const string SigningSecretPrefix = "whsec_";

    /// <summary>
    /// Webhook imzasını doğrular. İmzalanan içerik "{webhook-id}.{webhook-timestamp}.{body}",
    /// anahtar ise signing secret'ın "whsec_" önekinden sonraki base64 kısmıdır (HMAC-SHA256 → base64).
    ///
    /// webhook-signature başlığı iki biçimde gelebilir:
    ///   - düz base64:            "g0hM9SsE+OTP..."
    ///   - sürüm önekli ve çoklu: "v1,g0hM9SsE+OTP... v2,MzJsNDk4..."
    /// (Etsy, Svix altyapısını whitelabel başlıklarla kullanır.) Her iki biçim de desteklenir.
    /// Karşılaştırma timing attack'e karşı sabit zamanlıdır.
    /// </summary>
    private bool VerifySignature(string webhookId, string timestamp, string rawBody, string signingSecret, string headerSignature)
    {
        try
        {
            // "whsec_" önekini at. Not: kalan base64 gövdesinde de '_' bulunabileceğinden Split('_') kullanılmaz.
            var secretBase64 = signingSecret.StartsWith(SigningSecretPrefix, StringComparison.Ordinal)
                ? signingSecret[SigningSecretPrefix.Length..]
                : signingSecret;

            var secretBytes = Convert.FromBase64String(secretBase64);

            var signedContent = $"{webhookId}.{timestamp}.{rawBody}";
            var contentBytes = Encoding.UTF8.GetBytes(signedContent);

            using var hmac = new HMACSHA256(secretBytes);
            var expectedBytes = hmac.ComputeHash(contentBytes);

            foreach (var token in headerSignature.Split(' ', StringSplitOptions.RemoveEmptyEntries))
            {
                // "v1,<base64>" → virgülden sonrası; düz base64 ise olduğu gibi.
                var commaIndex = token.IndexOf(',');
                var candidate = commaIndex >= 0 ? token[(commaIndex + 1)..] : token;

                byte[] candidateBytes;
                try
                {
                    candidateBytes = Convert.FromBase64String(candidate);
                }
                catch (FormatException)
                {
                    continue; // Bu token base64 değil; sonraki imzayı dene.
                }

                if (CryptographicOperations.FixedTimeEquals(expectedBytes, candidateBytes))
                {
                    return true;
                }
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying webhook signature.");
            return false;
        }
    }

    public class EtsyWebhookPayload
    {
        [JsonPropertyName("event_type")]
        public string EventType { get; set; } = string.Empty;

        [JsonPropertyName("resource_url")]
        public string ResourceUrl { get; set; } = string.Empty;

        [JsonPropertyName("shop_id")]
        [JsonConverter(typeof(ShopIdStringConverter))]
        public string ShopId { get; set; } = string.Empty;
    }

    // Etsy ShopId sayı veya metin olarak dönebileceği için özel JsonConverter kullanıyoruz
    private class ShopIdStringConverter : JsonConverter<string>
    {
        public override string Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Number)
            {
                return reader.GetInt64().ToString();
            }
            return reader.GetString() ?? string.Empty;
        }

        public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value);
        }
    }
}
