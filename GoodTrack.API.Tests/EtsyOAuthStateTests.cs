using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Infrastructure.Repositories;
using GoodTrack.API.Models;
using GoodTrack.API.Services.Etsy;

namespace GoodTrack.API.Tests;

/// <summary>
/// OAuth state'inin kalıcı depoya taşınmasının davranış testleri:
/// tek kullanımlık tüketim, süre dolumu ve sızıntıya karşı temizlik.
/// </summary>
public class EtsyOAuthStateTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;
    private readonly PostgresEtsyOAuthStateRepository _repository;
    private readonly EtsyOAuthService _oauthService;

    public EtsyOAuthStateTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;
        _context = new AppDbContext(options, Mock.Of<Microsoft.AspNetCore.Http.IHttpContextAccessor>());
        _context.Database.EnsureCreated();

        _context.Users.Add(new User { Id = "u1", Username = "seller", Role = "seller" });
        _context.SaveChanges();

        _repository = new PostgresEtsyOAuthStateRepository(_context);
        _oauthService = new EtsyOAuthService(_repository, Mock.Of<ILogger<EtsyOAuthService>>());
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    private async Task SeedStateAsync(string state, DateTime expiresAt, string userId = "u1")
    {
        await _repository.AddAsync(new EtsyOAuthState
        {
            State = state,
            UserId = userId,
            CodeVerifier = "verifier-" + state,
            CallbackUrl = "https://api.example.com/callback",
            FrontendUrl = "https://app.example.com/profile",
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = expiresAt
        });
    }

    [Fact]
    public async Task Consume_ValidState_ReturnsPayloadAndDeletesRow()
    {
        await SeedStateAsync("s1", DateTime.UtcNow.AddMinutes(10));

        var result = await _repository.ConsumeAsync("s1");

        result.Should().NotBeNull();
        result!.UserId.Should().Be("u1");
        result.CodeVerifier.Should().Be("verifier-s1");
        result.FrontendUrl.Should().Be("https://app.example.com/profile");

        _context.EtsyOAuthStates.Should().BeEmpty();
    }

    [Fact]
    public async Task Consume_IsSingleUse_SecondCallReturnsNull()
    {
        await SeedStateAsync("s1", DateTime.UtcNow.AddMinutes(10));

        var first = await _repository.ConsumeAsync("s1");
        var second = await _repository.ConsumeAsync("s1");

        first.Should().NotBeNull();
        second.Should().BeNull();
    }

    [Fact]
    public async Task Consume_ExpiredState_ReturnsNullAndRemovesRow()
    {
        await SeedStateAsync("s1", DateTime.UtcNow.AddMinutes(-1));

        var result = await _repository.ConsumeAsync("s1");

        result.Should().BeNull();
        _context.EtsyOAuthStates.Should().BeEmpty(); // temizlenmiş olmalı
    }

    [Fact]
    public async Task Consume_UnknownState_ReturnsNull()
    {
        var result = await _repository.ConsumeAsync("nope");
        result.Should().BeNull();
    }

    [Fact]
    public async Task DeleteExpired_RemovesOnlyExpiredRows()
    {
        await SeedStateAsync("expired-1", DateTime.UtcNow.AddMinutes(-5));
        await SeedStateAsync("expired-2", DateTime.UtcNow.AddSeconds(-1));
        await SeedStateAsync("live", DateTime.UtcNow.AddMinutes(10));

        var deleted = await _repository.DeleteExpiredAsync();

        deleted.Should().Be(2);
        _context.EtsyOAuthStates.Select(s => s.State).Should().BeEquivalentTo(new[] { "live" });
    }

    [Fact]
    public async Task GenerateOAuthUrl_PersistsStateAndPurgesExpired_AndUrlCarriesPkce()
    {
        // Sızıntı kontrolü: eski/süresi dolmuş kayıt yeni URL üretiminde temizlenmeli.
        await SeedStateAsync("stale", DateTime.UtcNow.AddMinutes(-30));

        var url = await _oauthService.GenerateOAuthUrlAsync(
            "u1", "my-keystring", "https://api.example.com/callback", "https://app.example.com/profile");

        url.Should().StartWith("https://www.etsy.com/oauth/connect?");
        url.Should().Contain("client_id=my-keystring");
        url.Should().Contain("code_challenge_method=S256");
        url.Should().Contain("code_challenge=");

        var states = _context.EtsyOAuthStates.AsNoTracking().ToList();
        states.Should().HaveCount(1);              // sadece yeni kayıt kaldı
        states[0].State.Should().NotBe("stale");   // süresi dolan silindi
        states[0].UserId.Should().Be("u1");
        states[0].CodeVerifier.Should().NotBeNullOrWhiteSpace();
        states[0].FrontendUrl.Should().Be("https://app.example.com/profile");

        // Üretilen state, URL'deki state ile aynı olmalı
        url.Should().Contain($"state={states[0].State}");
    }

    [Fact]
    public async Task ConsumePendingConnection_MapsStoredStateToPendingContext()
    {
        await SeedStateAsync("s1", DateTime.UtcNow.AddMinutes(10));

        var pending = await _oauthService.ConsumePendingConnectionAsync("s1");

        pending.Should().NotBeNull();
        pending!.UserId.Should().Be("u1");
        pending.CodeVerifier.Should().Be("verifier-s1");
        pending.CallbackUrl.Should().Be("https://api.example.com/callback");
        pending.FrontendUrl.Should().Be("https://app.example.com/profile");
    }

    [Fact]
    public async Task ConsumePendingConnection_ExpiredState_ReturnsNull()
    {
        await SeedStateAsync("s1", DateTime.UtcNow.AddMinutes(-1));

        var pending = await _oauthService.ConsumePendingConnectionAsync("s1");

        pending.Should().BeNull();
    }
}
