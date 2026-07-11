using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using Microsoft.Extensions.Configuration;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Controllers;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Models;
using GoodTrack.API.Services;

namespace GoodTrack.API.Tests;

/// <summary>
/// Etsy webhook'unu gerçek bir JSON isteği gibi test eder: gerçek Etsy mağazası
/// gerektirmeden, imzalı order.paid / order.canceled gövdelerini controller'a POST'lar.
/// </summary>
public class EtsyWebhookControllerTests : IDisposable
{
    // Rastgele 32 byte'lık signing secret (whsec_ öneki olmadan, base64).
    private const string SecretBase64 = "c2VjcmV0LWtleS1mb3ItZXRzeS13ZWJob29rLXRlc3Qh";
    private const string SigningSecret = "whsec_" + SecretBase64;
    private const string WebhookId = "wh_test_1";

    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;
    private readonly Mock<IEtsyApiClient> _apiClientMock = new();
    private readonly Mock<IEtsyOAuthService> _oauthServiceMock = new();
    private readonly Mock<IEtsyConnectionRepository> _connectionRepositoryMock = new();
    private readonly Mock<IProductService> _productServiceMock = new();
    private readonly Mock<IOrderWorkflowService> _orderWorkflowMock = new();
    private readonly EtsyService _etsyService;
    private EtsyWebhookController _controller;

    public EtsyWebhookControllerTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        _context = new AppDbContext(options, httpContextAccessorMock.Object);
        _context.Database.EnsureCreated();

        _etsyService = new EtsyService(
            _context,
            _apiClientMock.Object,
            _oauthServiceMock.Object,
            _connectionRepositoryMock.Object,
            _productServiceMock.Object,
            _orderWorkflowMock.Object,
            Mock.Of<ILogger<EtsyService>>());

        _controller = BuildController();
    }

    /// <summary>Verilen platform secret ile controller kurar (null → platform secret tanımlı değil).</summary>
    private EtsyWebhookController BuildController(string? platformSecret = null)
    {
        var settings = new Dictionary<string, string?>();
        if (platformSecret != null)
        {
            settings["Etsy:WebhookSigningSecret"] = platformSecret;
        }
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
        return new EtsyWebhookController(_context, _etsyService, configuration, Mock.Of<ILogger<EtsyWebhookController>>());
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    private void SeedActiveConnection(string shopId = "shop-1", string userId = "u1", string? signingSecret = SigningSecret)
    {
        if (!_context.Users.Any(u => u.Id == userId))
        {
            _context.Users.Add(new User { Id = userId, Username = "seller", Role = "seller" });
            _context.SaveChanges();
        }

        _context.EtsyConnections.Add(new EtsyConnection
        {
            UserId = userId,
            EtsyShopId = shopId,
            EtsyShopName = "Test Shop",
            ApiKeyKeystring = "key",
            ApiKeySharedSecret = "secret",
            AccessToken = "access",
            RefreshToken = "refresh",
            TokenExpiresAt = DateTime.UtcNow.AddHours(1),
            IsActive = true,
            WebhookSigningSecret = signingSecret
        });
        _context.SaveChanges();
    }

    private void SeedOrder(string id, long etsyReceiptId, string sellerId = "u1")
    {
        _context.Products.Add(new Product
        {
            Id = id,
            Code = "SKU-1",
            SellerId = sellerId,
            ManufacturerId = "m1",
            Status = "awaiting",
            EtsyReceiptId = etsyReceiptId,
            CreatedAt = DateTime.UtcNow
        });
        _context.SaveChanges();
    }

    /// <summary>Etsy'nin ürettiği imzanın birebir aynısını üretir (HMAC-SHA256 → base64).</summary>
    private static string ComputeSignature(string webhookId, string timestamp, string body)
    {
        using var hmac = new HMACSHA256(Convert.FromBase64String(SecretBase64));
        var content = Encoding.UTF8.GetBytes($"{webhookId}.{timestamp}.{body}");
        return Convert.ToBase64String(hmac.ComputeHash(content));
    }

    /// <summary>
    /// İsteği kurar. Zaman damgası TEK yerde üretilir (imza ile başlık tutarlı kalsın diye).
    /// - rawSignature verilirse başlık aynen o olur.
    /// - signatureFormat verilirse geçerli imza bu şablona yerleştirilir (ör. "v1,{0}").
    /// - ikisi de yoksa düz base64 geçerli imza kullanılır.
    /// </summary>
    private void SetRequest(string json, string? rawSignature = null, string? signatureFormat = null)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();

        var signature = rawSignature
            ?? (signatureFormat != null
                ? string.Format(signatureFormat, ComputeSignature(WebhookId, timestamp, json))
                : ComputeSignature(WebhookId, timestamp, json));

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(json));
        httpContext.Request.ContentType = "application/json";
        httpContext.Request.Headers["webhook-id"] = WebhookId;
        httpContext.Request.Headers["webhook-timestamp"] = timestamp;
        httpContext.Request.Headers["webhook-signature"] = signature;
        _controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
    }

    private static string CanceledPayload(string shopId = "shop-1", long receiptId = 999) =>
        $"{{\"event_type\":\"order.canceled\",\"resource_url\":\"https://api.etsy.com/v3/application/shops/{shopId}/receipts/{receiptId}\",\"shop_id\":\"{shopId}\"}}";

    [Fact]
    public async Task HandleWebhook_OrderCanceled_ValidSignature_CancelsMatchingOrder()
    {
        SeedActiveConnection();
        SeedOrder("o1", etsyReceiptId: 999);

        SetRequest(CanceledPayload());

        var result = await _controller.HandleWebhook(CancellationToken.None);

        result.Should().BeOfType<OkResult>();
        _orderWorkflowMock.Verify(
            s => s.ApplyExternalCancellationAsync("u1", "o1", It.IsAny<string>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleWebhook_VersionPrefixedSignature_IsAccepted()
    {
        // Svix "v1,<base64>" biçimi de kabul edilmeli.
        SeedActiveConnection();
        SeedOrder("o1", etsyReceiptId: 999);

        SetRequest(CanceledPayload(), signatureFormat: "v1,{0}");

        var result = await _controller.HandleWebhook(CancellationToken.None);

        result.Should().BeOfType<OkResult>();
        _orderWorkflowMock.Verify(s => s.ApplyExternalCancellationAsync("u1", "o1", It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task HandleWebhook_MultipleSpaceDelimitedSignatures_IsAccepted()
    {
        // Birden çok imzadan biri doğruysa kabul edilmeli.
        SeedActiveConnection();
        SeedOrder("o1", etsyReceiptId: 999);

        SetRequest(CanceledPayload(), signatureFormat: "v0,bm90LXRoZS1yaWdodC1zaWc= v1,{0}");

        var result = await _controller.HandleWebhook(CancellationToken.None);

        result.Should().BeOfType<OkResult>();
        _orderWorkflowMock.Verify(s => s.ApplyExternalCancellationAsync("u1", "o1", It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task HandleWebhook_InvalidSignature_IsRejected()
    {
        SeedActiveConnection();
        SeedOrder("o1", etsyReceiptId: 999);

        SetRequest(CanceledPayload(), rawSignature: "v1,bm90LWEtdmFsaWQtc2lnbmF0dXJl");

        var result = await _controller.HandleWebhook(CancellationToken.None);

        result.Should().BeOfType<UnauthorizedObjectResult>();
        _orderWorkflowMock.Verify(
            s => s.ApplyExternalCancellationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleWebhook_NoSigningSecretConfigured_IsRejected()
    {
        // Güvenli varsayılan: secret yoksa istek işlenmez (imza doğrulanamaz).
        SeedActiveConnection(signingSecret: null);
        SeedOrder("o1", etsyReceiptId: 999);

        SetRequest(CanceledPayload());

        var result = await _controller.HandleWebhook(CancellationToken.None);

        result.Should().BeOfType<UnauthorizedObjectResult>();
        _orderWorkflowMock.Verify(
            s => s.ApplyExternalCancellationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleWebhook_PlatformSecretConfigured_ShopWithoutSecret_IsProcessed()
    {
        // Commercial senaryosu: satıcı signing secret GİRMEDEN mağazasını bağlar.
        // Platform (uygulama) düzeyindeki secret webhook'u doğrular.
        _controller = BuildController(platformSecret: SigningSecret);
        SeedActiveConnection(signingSecret: null);
        SeedOrder("o1", etsyReceiptId: 999);

        SetRequest(CanceledPayload());

        var result = await _controller.HandleWebhook(CancellationToken.None);

        result.Should().BeOfType<OkResult>();
        _orderWorkflowMock.Verify(s => s.ApplyExternalCancellationAsync("u1", "o1", It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task HandleWebhook_PlatformSecretTakesPrecedenceOverShopSecret()
    {
        // Platform secret varsa, mağaza secret'ı farklı/yanlış olsa bile platform secret kullanılır.
        _controller = BuildController(platformSecret: SigningSecret);
        SeedActiveConnection(signingSecret: "whsec_Zm9vYmFyLXdyb25nLXNlY3JldA=="); // farklı, yanlış secret
        SeedOrder("o1", etsyReceiptId: 999);

        SetRequest(CanceledPayload()); // imza platform secret (SecretBase64) ile üretiliyor

        var result = await _controller.HandleWebhook(CancellationToken.None);

        result.Should().BeOfType<OkResult>();
        _orderWorkflowMock.Verify(s => s.ApplyExternalCancellationAsync("u1", "o1", It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task HandleWebhook_TamperedBody_IsRejected()
    {
        // İmza orijinal gövde için üretilir, sonra gövde değiştirilir.
        SeedActiveConnection();
        SeedOrder("o1", etsyReceiptId: 999);

        var original = CanceledPayload();
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var signature = ComputeSignature(WebhookId, timestamp, original);
        var tampered = CanceledPayload(receiptId: 1234);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(tampered));
        httpContext.Request.Headers["webhook-id"] = WebhookId;
        httpContext.Request.Headers["webhook-timestamp"] = timestamp;
        httpContext.Request.Headers["webhook-signature"] = signature;
        _controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        var result = await _controller.HandleWebhook(CancellationToken.None);

        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task HandleWebhook_UnknownShop_IgnoredWith200()
    {
        // Bağlantı yok — Etsy'nin webhook'u devre dışı bırakmaması için 200 döner.
        SetRequest(CanceledPayload(shopId: "nope"));

        var result = await _controller.HandleWebhook(CancellationToken.None);

        result.Should().BeOfType<OkResult>();
        _orderWorkflowMock.Verify(
            s => s.ApplyExternalCancellationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }
}
