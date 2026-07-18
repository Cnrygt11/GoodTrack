using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Models;
using GoodTrack.API.Constants;
using GoodTrack.API.Infrastructure.Auditing;
using GoodTrack.API.Infrastructure.Configurations;

using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace GoodTrack.API.Infrastructure;

public sealed class AppDbContext : DbContext, IDataProtectionKeyContext
{
    // Test/DI dışı senaryolarda tutarlı tek bir provider paylaşılır (model cache uyumu için).
    private static readonly IDataProtectionProvider FallbackProtectionProvider = new EphemeralDataProtectionProvider();

    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IDataProtectionProvider _dataProtectionProvider;

    public AppDbContext(
        DbContextOptions<AppDbContext> options,
        IHttpContextAccessor httpContextAccessor,
        IDataProtectionProvider? dataProtectionProvider = null) : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
        _dataProtectionProvider = dataProtectionProvider ?? FallbackProtectionProvider;
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<CatalogProduct> CatalogProducts => Set<CatalogProduct>();
    public DbSet<ConnectionRequest> ConnectionRequests => Set<ConnectionRequest>();
    public DbSet<ExtraFieldDef> ExtraFieldDefs => Set<ExtraFieldDef>();
    public DbSet<Feedback> Feedbacks => Set<Feedback>();
    public DbSet<UserCredit> UserCredits => Set<UserCredit>();
    public DbSet<UserConnection> UserConnections => Set<UserConnection>();
    public DbSet<EtsyConnection> EtsyConnections => Set<EtsyConnection>();
    public DbSet<EtsyOAuthState> EtsyOAuthStates => Set<EtsyOAuthState>();

    /// <summary>
    /// Data Protection anahtar halkasının kalıcı deposu (production'da restart/multi-instance
    /// arasında token şifreleme anahtarları korunur). Data Protection bu tabloyu okurken
    /// EtsyConnection converter'ını tetiklemez; döngü oluşmaz.
    /// </summary>
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        bool isSqlite = Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite";

        // Automatically discover and apply all configurations, injecting isSqlite if constructor accepts it
        var configTypes = typeof(AppDbContext).Assembly.GetTypes()
            .Where(t => !t.IsAbstract && !t.IsInterface && t.GetInterfaces().Any(gi => gi.IsGenericType && gi.GetGenericTypeDefinition() == typeof(IEntityTypeConfiguration<>)));

        foreach (var type in configTypes)
        {
            var constructor = type.GetConstructor(new[] { typeof(bool) });
            object configInstance = constructor != null
                ? constructor.Invoke(new object[] { isSqlite })
                : Activator.CreateInstance(type)!;

            var entityType = type.GetInterfaces()
                .First(gi => gi.IsGenericType && gi.GetGenericTypeDefinition() == typeof(IEntityTypeConfiguration<>))
                .GetGenericArguments()[0];

            var applyMethod = typeof(ModelBuilder)
                .GetMethods()
                .First(m => m.Name == nameof(ModelBuilder.ApplyConfiguration)
                            && m.GetParameters().Length == 1
                            && m.GetParameters()[0].ParameterType.IsGenericType
                            && m.GetParameters()[0].ParameterType.GetGenericTypeDefinition() == typeof(IEntityTypeConfiguration<>))
                .MakeGenericMethod(entityType);

            applyMethod.Invoke(modelBuilder, new[] { configInstance });
        }

        ConfigureEtsyConnectionEncryption(modelBuilder);
    }

    /// <summary>
    /// EtsyConnection'daki hassas alanları (OAuth token'ları ve secret'lar) at-rest şifreler.
    /// Reflection ile uygulanan configuration'lardan SONRA çalışır; ilgili kolonların
    /// uzunluğunu şifreli çıktıyı taşıyacak şekilde büyütür ve converter'ı bağlar.
    /// ApiKeyKeystring public bir tanımlayıcıdır (client_id), şifrelenmez.
    /// </summary>
    private void ConfigureEtsyConnectionEncryption(ModelBuilder modelBuilder)
    {
        var protector = _dataProtectionProvider.CreateProtector("GoodTrack.EtsyConnection.v1");
        var converter = new EncryptedStringConverter(protector);

        var entity = modelBuilder.Entity<EtsyConnection>();
        entity.Property(e => e.AccessToken).HasMaxLength(2000).HasConversion(converter);
        entity.Property(e => e.RefreshToken).HasMaxLength(2000).HasConversion(converter);
        entity.Property(e => e.ApiKeySharedSecret).HasMaxLength(2000).HasConversion(converter);
        // WebhookSigningSecret nullable: null değerler zaten converter'a gönderilmez.
        entity.Property(e => e.WebhookSigningSecret).HasMaxLength(2000).HasConversion(converter!);
    }

    public override int SaveChanges()
    {
        StampArchivedAt();
        var auditEntries = AuditTrail.Collect(ChangeTracker);
        var result = base.SaveChanges();
        AuditTrail.Persist(this, auditEntries, GetCurrentUserId());
        return result;
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampArchivedAt();
        var auditEntries = AuditTrail.Collect(ChangeTracker);
        var result = await base.SaveChangesAsync(cancellationToken);
        await AuditTrail.PersistAsync(this, auditEntries, GetCurrentUserId());
        return result;
    }

    private string? GetCurrentUserId()
        => _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    /// <summary>
    /// Sipariş terminal ("arşiv") duruma (kargolandı/iptal) geçtiğinde <see cref="Product.ArchivedAt"/>
    /// damgasını bir kez set eder. Merkezî yapılır ki tüm terminal geçiş yolları (workflow, iptal,
    /// harici webhook iptali) tek noktadan kapsansın. Damga, ChangeTracker'daki değişiklik audit'e de
    /// yansısın diye OnBeforeSaveChanges'ten önce uygulanır.
    /// </summary>
    private void StampArchivedAt()
    {
        foreach (var entry in ChangeTracker.Entries<Product>())
        {
            if (entry.State != EntityState.Added && entry.State != EntityState.Modified)
                continue;

            var product = entry.Entity;
            if (product.ArchivedAt != null)
                continue;

            bool isTerminal =
                string.Equals(product.Status, OrderStatus.Shipped, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(product.Status, OrderStatus.Cancelled, StringComparison.OrdinalIgnoreCase);

            if (isTerminal)
                product.ArchivedAt = DateTime.UtcNow;
        }
    }

}

