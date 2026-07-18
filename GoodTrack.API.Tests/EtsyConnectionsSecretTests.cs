using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Controllers;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Models;

namespace GoodTrack.API.Tests;

/// <summary>
/// GET /etsysync/connections yanıtının webhook signing secret'ı istemciye SIZDIRMADIĞINI
/// doğrular: yalnız hasWebhookSecret bayrağı döner (yazılabilir, geri okunamaz semantiği).
/// </summary>
public class EtsyConnectionsSecretTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;
    private readonly Mock<IEtsyService> _etsyServiceMock = new();
    private readonly EtsySyncController _controller;

    public EtsyConnectionsSecretTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;
        _context = new AppDbContext(options, Mock.Of<IHttpContextAccessor>());
        _context.Database.EnsureCreated();

        _controller = new EtsySyncController(
            _etsyServiceMock.Object,
            Mock.Of<IProductService>(),
            new ConfigurationBuilder().Build(),
            Mock.Of<ILogger<EtsySyncController>>());

        var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "u1") }, "test");
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    [Fact]
    public async Task GetConnections_DoesNotLeakSecret_ReturnsFlagOnly()
    {
        const string rawSecret = "whsec_SUPER_SECRET_VALUE";
        _etsyServiceMock
            .Setup(s => s.GetConnectionsAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<EtsyConnection>
            {
                new()
                {
                    UserId = "u1",
                    EtsyShopId = "shop-1",
                    EtsyShopName = "Shop",
                    WebhookSigningSecret = rawSecret,
                    IsActive = true,
                    TokenExpiresAt = DateTime.UtcNow.AddHours(1)
                },
                new()
                {
                    UserId = "u1",
                    EtsyShopId = "shop-2",
                    EtsyShopName = "Shop2",
                    WebhookSigningSecret = null,
                    IsActive = true,
                    TokenExpiresAt = DateTime.UtcNow.AddHours(1)
                }
            });

        var result = await _controller.GetConnections(CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var json = JsonSerializer.Serialize(ok.Value);

        json.Should().NotContain(rawSecret);
        json.Should().NotContain("webhookSigningSecret", "secret alanı yanıtta hiç bulunmamalı");
        json.Should().Contain("hasWebhookSecret");

        // Test doğrudan System.Text.Json ile serileştirir: ApiResponse özellikleri PascalCase
        // ("Data"), controller'ın anonim tip alanları ise yazıldığı gibi camelCase kalır.
        using var doc = JsonDocument.Parse(json);
        var data = doc.RootElement.GetProperty("Data");
        data[0].GetProperty("hasWebhookSecret").GetBoolean().Should().BeTrue();
        data[1].GetProperty("hasWebhookSecret").GetBoolean().Should().BeFalse();
    }
}
