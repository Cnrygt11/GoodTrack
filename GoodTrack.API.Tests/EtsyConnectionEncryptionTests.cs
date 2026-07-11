using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Models;

namespace GoodTrack.API.Tests;

/// <summary>
/// Etsy token/secret'larının veritabanına ŞİFRELİ yazıldığını ve okurken çözüldüğünü doğrular.
/// Aynı SQLite bağlantısı üzerinden ayrı context'ler kullanılır — böylece cache'lenmiş değil,
/// gerçekten diske yazılan değer test edilir.
/// </summary>
public class EtsyConnectionEncryptionTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<AppDbContext> _options;

    public EtsyConnectionEncryptionTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;

        using var ctx = NewContext();
        ctx.Database.EnsureCreated();
        ctx.Users.Add(new User { Id = "u1", Username = "seller", Role = "seller" });
        ctx.SaveChanges();
    }

    private AppDbContext NewContext() => new(_options, Mock.Of<Microsoft.AspNetCore.Http.IHttpContextAccessor>());

    public void Dispose()
    {
        _connection.Dispose();
    }

    private static EtsyConnection SampleConnection() => new()
    {
        UserId = "u1",
        EtsyShopId = "shop-1",
        EtsyShopName = "Test Shop",
        ApiKeyKeystring = "public-keystring",
        ApiKeySharedSecret = "super-secret-value",
        AccessToken = "12345.access-token-plaintext",
        RefreshToken = "12345.refresh-token-plaintext",
        WebhookSigningSecret = "whsec_shopsecret",
        TokenExpiresAt = DateTime.UtcNow.AddHours(1),
        IsActive = true
    };

    // Not: SQLite test context'i snake_case convention kullanmaz (o yalnızca Npgsql/production'da),
    // bu yüzden kolon adları property adlarıyla (PascalCase) aynıdır.
    private async Task<string?> RawColumnAsync(string column)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = $"SELECT \"{column}\" FROM etsy_connections WHERE \"UserId\" = 'u1' AND \"EtsyShopId\" = 'shop-1'";
        var result = await cmd.ExecuteScalarAsync();
        return result as string;
    }

    [Fact]
    public async Task SensitiveColumns_AreStoredEncrypted_NotPlaintext()
    {
        using (var ctx = NewContext())
        {
            ctx.EtsyConnections.Add(SampleConnection());
            await ctx.SaveChangesAsync();
        }

        // DB'deki HAM değerler orijinal düz metni İÇERMEMELİ
        (await RawColumnAsync("AccessToken")).Should().NotContain("access-token-plaintext");
        (await RawColumnAsync("RefreshToken")).Should().NotContain("refresh-token-plaintext");
        (await RawColumnAsync("ApiKeySharedSecret")).Should().NotContain("super-secret-value");
        (await RawColumnAsync("WebhookSigningSecret")).Should().NotContain("whsec_shopsecret");

        // Public identifier şifrelenmez
        (await RawColumnAsync("ApiKeyKeystring")).Should().Be("public-keystring");
    }

    [Fact]
    public async Task SensitiveColumns_RoundTrip_DecryptedOnRead()
    {
        using (var ctx = NewContext())
        {
            ctx.EtsyConnections.Add(SampleConnection());
            await ctx.SaveChangesAsync();
        }

        using var readCtx = NewContext();
        var loaded = await readCtx.EtsyConnections.FirstAsync(c => c.UserId == "u1");

        loaded.AccessToken.Should().Be("12345.access-token-plaintext");
        loaded.RefreshToken.Should().Be("12345.refresh-token-plaintext");
        loaded.ApiKeySharedSecret.Should().Be("super-secret-value");
        loaded.WebhookSigningSecret.Should().Be("whsec_shopsecret");
    }

    [Fact]
    public async Task LegacyPlaintextValue_IsReadableViaFallback()
    {
        // Şifreleme öncesinden kalma düz metin token'ı doğrudan (ham) yazıp okunabildiğini doğrula.
        using (var seed = NewContext())
        {
            seed.EtsyConnections.Add(SampleConnection());
            await seed.SaveChangesAsync();
        }

        using (var cmd = _connection.CreateCommand())
        {
            cmd.CommandText = "UPDATE etsy_connections SET \"AccessToken\" = 'legacy-plaintext-token' WHERE \"UserId\" = 'u1'";
            await cmd.ExecuteNonQueryAsync();
        }

        using var readCtx = NewContext();
        var loaded = await readCtx.EtsyConnections.FirstAsync(c => c.UserId == "u1");

        // Çözme başarısız → ham değer döner (kademeli geçiş)
        loaded.AccessToken.Should().Be("legacy-plaintext-token");
    }
}
