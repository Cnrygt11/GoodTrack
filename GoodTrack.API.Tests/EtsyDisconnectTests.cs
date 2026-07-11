using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Controllers;
using GoodTrack.API.DTOs.Etsy;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Models;

namespace GoodTrack.API.Tests;

/// <summary>
/// Etsy mağaza bağlantısını kesmenin (disconnect) davranışını doğrular: satıcı disconnect
/// ettiğinde bağlantı ve (şifreli) OAuth token'ları veritabanından silinir — Etsy erişimi
/// için sakladığımız kimlik verisi kalmaz. Bir satıcı başka satıcının bağlantısını kesemez.
/// </summary>
public class EtsyDisconnectTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;
    private readonly EtsySyncController _controller;

    public EtsyDisconnectTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;
        _context = new AppDbContext(options, Mock.Of<IHttpContextAccessor>());
        _context.Database.EnsureCreated();

        _controller = new EtsySyncController(
            _context,
            Mock.Of<IEtsyService>(),
            Mock.Of<IProductService>(),
            new ConfigurationBuilder().Build(),
            Mock.Of<ILogger<EtsySyncController>>());
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    private void Authenticate(string userId)
    {
        var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, userId) }, "test");
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
    }

    private void SeedConnection(string userId, string shopId)
    {
        if (!_context.Users.Any(u => u.Id == userId))
        {
            _context.Users.Add(new User { Id = userId, Username = userId, Role = "seller" });
        }
        _context.EtsyConnections.Add(new EtsyConnection
        {
            UserId = userId,
            EtsyShopId = shopId,
            EtsyShopName = "Shop",
            ApiKeyKeystring = "key",
            ApiKeySharedSecret = "secret",
            AccessToken = "access-token",
            RefreshToken = "refresh-token",
            TokenExpiresAt = DateTime.UtcNow.AddHours(1),
            IsActive = true
        });
        _context.SaveChanges();
    }

    [Fact]
    public async Task Disconnect_RemovesConnectionAndTokens()
    {
        SeedConnection("u1", "shop-1");
        Authenticate("u1");

        var result = await _controller.DisconnectShop(new DisconnectShopDto { EtsyShopId = "shop-1" }, CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        _context.EtsyConnections.Any(c => c.UserId == "u1" && c.EtsyShopId == "shop-1").Should().BeFalse();
    }

    private EtsySyncController BuildController(string? platformSecret)
    {
        var settings = new Dictionary<string, string?>();
        if (platformSecret != null) settings["Etsy:WebhookSigningSecret"] = platformSecret;
        var config = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
        return new EtsySyncController(_context, Mock.Of<IEtsyService>(), Mock.Of<IProductService>(), config, Mock.Of<ILogger<EtsySyncController>>());
    }

    [Fact]
    public void WebhookConfig_PlatformSecretSet_ReportsConfigured()
    {
        var controller = BuildController("whsec_abc");

        var result = controller.GetWebhookConfig() as OkObjectResult;
        var body = result!.Value as GoodTrack.API.DTOs.Common.ApiResponse<object>;
        body!.Data.Should().BeEquivalentTo(new { platformConfigured = true });
    }

    [Fact]
    public void WebhookConfig_NoPlatformSecret_ReportsNotConfigured()
    {
        var controller = BuildController(platformSecret: null);

        var result = controller.GetWebhookConfig() as OkObjectResult;
        var body = result!.Value as GoodTrack.API.DTOs.Common.ApiResponse<object>;
        body!.Data.Should().BeEquivalentTo(new { platformConfigured = false });
    }

    [Fact]
    public async Task Disconnect_DoesNotAffectOtherSellersConnection()
    {
        SeedConnection("owner", "shop-1");
        Authenticate("intruder");

        await _controller.DisconnectShop(new DisconnectShopDto { EtsyShopId = "shop-1" }, CancellationToken.None);

        // Başka satıcının bağlantısı silinmemeli
        _context.EtsyConnections.Any(c => c.UserId == "owner" && c.EtsyShopId == "shop-1").Should().BeTrue();
    }

    [Fact]
    public async Task DeletingUser_CascadeRemovesEtsyConnection()
    {
        // Hesap silme (admin) → cascade ile Etsy bağlantısı ve token'lar da silinir.
        SeedConnection("u1", "shop-1");

        var user = _context.Users.First(u => u.Id == "u1");
        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        _context.EtsyConnections.Any(c => c.UserId == "u1").Should().BeFalse();
    }
}
