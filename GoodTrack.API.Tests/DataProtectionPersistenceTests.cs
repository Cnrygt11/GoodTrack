using System.Linq;
using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;
using GoodTrack.API.Infrastructure;

namespace GoodTrack.API.Tests;

/// <summary>
/// Data Protection anahtar halkasının AppDbContext üzerinden veritabanında kalıcı
/// tutulmasını uçtan uca doğrular. En önemlisi: AppDbContext hem şifreleme provider'ına
/// bağımlıdır hem de anahtar deposudur — bu kurulumun DI'da CIRCULAR DEPENDENCY
/// oluşturmadığını (host'un ayağa kalktığını) kanıtlar.
/// </summary>
public class DataProtectionPersistenceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly ServiceProvider _serviceProvider;

    public DataProtectionPersistenceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var services = new ServiceCollection();
        services.AddSingleton(Mock.Of<IHttpContextAccessor>());
        services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));
        services.AddDataProtection()
            .PersistKeysToDbContext<AppDbContext>()
            .SetApplicationName("GoodTrack");

        _serviceProvider = services.BuildServiceProvider();

        using var scope = _serviceProvider.CreateScope();
        scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreated();
    }

    public void Dispose()
    {
        _serviceProvider.Dispose();
        _connection.Dispose();
    }

    [Fact]
    public void ProtectAndUnprotect_PersistsKeyToDatabase_AndRoundTrips()
    {
        // Provider'ı resolve etmek + ilk Protect çağrısı, anahtar halkasını başlatır.
        // Döngü olsaydı burası patlardı.
        var provider = _serviceProvider.GetRequiredService<IDataProtectionProvider>();
        var protector = provider.CreateProtector("GoodTrack.EtsyConnection.v1");

        var cipher = protector.Protect("etsy-access-token");
        cipher.Should().NotBe("etsy-access-token");
        protector.Unprotect(cipher).Should().Be("etsy-access-token");

        // Anahtar veritabanına yazılmış olmalı
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.DataProtectionKeys.Should().NotBeEmpty();
    }

    [Fact]
    public void PersistedKey_SurvivesProviderRebuild_DecryptsAcrossRestart()
    {
        // 1. instance: şifrele
        var provider1 = _serviceProvider.GetRequiredService<IDataProtectionProvider>();
        var cipher = provider1.CreateProtector("GoodTrack.EtsyConnection.v1").Protect("secret-value");

        // "Restart" simülasyonu: AYNI veritabanına (aynı connection) bağlı YENİ bir servis sağlayıcı.
        var services2 = new ServiceCollection();
        services2.AddSingleton(Mock.Of<IHttpContextAccessor>());
        services2.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));
        services2.AddDataProtection()
            .PersistKeysToDbContext<AppDbContext>()
            .SetApplicationName("GoodTrack");

        using var sp2 = services2.BuildServiceProvider();
        var provider2 = sp2.GetRequiredService<IDataProtectionProvider>();

        // Yeni instance, DB'deki aynı anahtarla eski şifreli değeri çözebilmeli.
        provider2.CreateProtector("GoodTrack.EtsyConnection.v1").Unprotect(cipher).Should().Be("secret-value");
    }
}
