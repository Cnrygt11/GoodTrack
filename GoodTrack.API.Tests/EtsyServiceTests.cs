using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Etsy;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Models;
using GoodTrack.API.Services;

namespace GoodTrack.API.Tests;

public class EtsyServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;
    private readonly Mock<IEtsyApiClient> _apiClientMock = new();
    private readonly Mock<IEtsyOAuthService> _oauthServiceMock = new();
    private readonly Mock<IEtsyConnectionRepository> _connectionRepositoryMock = new();
    private readonly Mock<IProductService> _productServiceMock = new();
    private readonly EtsyService _service;

    public EtsyServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;
        var httpContextAccessorMock = new Mock<Microsoft.AspNetCore.Http.IHttpContextAccessor>();
        _context = new AppDbContext(options, httpContextAccessorMock.Object);
        _context.Database.EnsureCreated();

        _service = new EtsyService(
            _context,
            _apiClientMock.Object,
            _oauthServiceMock.Object,
            _connectionRepositoryMock.Object,
            _productServiceMock.Object,
            Mock.Of<ILogger<EtsyService>>());
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    private static EtsyConnection Connection(DateTime expiresAt) => new()
    {
        UserId = "u1",
        EtsyShopId = "shop-1",
        ApiKeyKeystring = "key",
        ApiKeySharedSecret = "secret",
        AccessToken = "old-access",
        RefreshToken = "old-refresh",
        TokenExpiresAt = expiresAt,
        IsActive = true,
    };

    [Fact]
    public async Task ExchangeStateForTokens_UnknownState_Throws()
    {
        _oauthServiceMock.Setup(o => o.ConsumePendingConnection("bad")).Returns((PendingConnectionState?)null);

        var act = () => _service.ExchangeStateForTokensAsync("bad", "code");
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task RefreshAccessToken_ConnectionNotFound_Throws()
    {
        _connectionRepositoryMock
            .Setup(r => r.GetAsync("u1", "shop-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((EtsyConnection?)null);

        var act = () => _service.RefreshAccessTokenAsync("u1", "shop-1");
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task RefreshAccessToken_StillValid_DoesNotCallApi()
    {
        var connection = Connection(DateTime.UtcNow.AddHours(1));
        _connectionRepositoryMock
            .Setup(r => r.GetAsync("u1", "shop-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(connection);

        var result = await _service.RefreshAccessTokenAsync("u1", "shop-1");

        result.AccessToken.Should().Be("old-access");
        _apiClientMock.Verify(
            c => c.RefreshTokenAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task RefreshAccessToken_Expired_RefreshesAndSaves()
    {
        var connection = Connection(DateTime.UtcNow.AddMinutes(-1));
        _connectionRepositoryMock
            .Setup(r => r.GetAsync("u1", "shop-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(connection);
        _apiClientMock
            .Setup(c => c.RefreshTokenAsync("key", "secret", "old-refresh", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EtsyTokenResponse { AccessToken = "new-access", RefreshToken = "new-refresh", ExpiresIn = 3600 });

        var result = await _service.RefreshAccessTokenAsync("u1", "shop-1");

        result.AccessToken.Should().Be("new-access");
        result.RefreshToken.Should().Be("new-refresh");
        result.IsActive.Should().BeTrue();
        _connectionRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RefreshAccessToken_ApiFails_DeactivatesConnectionAndRethrows()
    {
        var connection = Connection(DateTime.UtcNow.AddMinutes(-1));
        _connectionRepositoryMock
            .Setup(r => r.GetAsync("u1", "shop-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(connection);
        _apiClientMock
            .Setup(c => c.RefreshTokenAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Etsy token refresh failed"));

        var act = () => _service.RefreshAccessTokenAsync("u1", "shop-1");
        await act.Should().ThrowAsync<InvalidOperationException>();

        connection.IsActive.Should().BeFalse();
        _connectionRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetConnectionsAsync_DelegatesToRepository()
    {
        var expected = new List<EtsyConnection> { Connection(DateTime.UtcNow.AddHours(1)) };
        _connectionRepositoryMock
            .Setup(r => r.GetAllForUserAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        var result = await _service.GetConnectionsAsync("u1");

        result.Should().BeSameAs(expected);
    }
}
