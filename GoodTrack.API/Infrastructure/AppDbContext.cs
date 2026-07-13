using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Models;
using GoodTrack.API.Constants;
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
        var auditEntries = OnBeforeSaveChanges();
        var result = base.SaveChanges();
        OnAfterSaveChanges(auditEntries);
        return result;
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampArchivedAt();
        var auditEntries = OnBeforeSaveChanges();
        var result = await base.SaveChangesAsync(cancellationToken);
        await OnAfterSaveChangesAsync(auditEntries);
        return result;
    }

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

    /// <summary>
    /// Audit'e tam değeri yazılmayacak ağır (base64 görsel) alanlar. İçerik yerine "[omitted]" işaretçisi
    /// yazılır: "alan değişti" bilgisi korunur ama MB'lık base64, audit_logs'a kopyalanmaz.
    /// </summary>
    private static readonly HashSet<string> HeavyAuditColumns = new()
    {
        nameof(Product.Image),
        nameof(Product.DefectImage),
        nameof(User.ProfilePicture),
        nameof(User.ProductImages),
    };

    /// <summary>Ağır alan listesinde olmayan ama yine de büyük olan değerler için güvenlik eşiği.</summary>
    private const int MaxAuditValueLength = 2048;

    private const string OmittedAuditValue = "[omitted]";

    /// <summary>
    /// Audit'e yazılacak değeri sanitize eder: ağır sütunlar ve eşiği aşan uzun string'ler için
    /// gerçek içerik yerine <see cref="OmittedAuditValue"/> döner.
    /// </summary>
    private static object SanitizeAuditValue(string propertyName, object? value)
    {
        if (value is null) return "NULL";
        if (HeavyAuditColumns.Contains(propertyName)) return OmittedAuditValue;
        if (value is string s && s.Length > MaxAuditValueLength) return OmittedAuditValue;
        return value;
    }

    private List<AuditEntry> OnBeforeSaveChanges()
    {
        ChangeTracker.DetectChanges();
        var auditEntries = new List<AuditEntry>();

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.Entity is AuditLog || entry.State == EntityState.Detached || entry.State == EntityState.Unchanged)
                continue;

            var auditEntry = new AuditEntry(entry)
            {
                TableName = entry.Metadata.GetTableName() ?? entry.Metadata.Name,
                Action = entry.State.ToString()
            };

            auditEntries.Add(auditEntry);

            foreach (var property in entry.Properties)
            {
                string propertyName = property.Metadata.Name;
                if (property.Metadata.IsPrimaryKey())
                {
                    auditEntry.KeyValues[propertyName] = property.CurrentValue ?? "NULL";
                    continue;
                }

                switch (entry.State)
                {
                    case EntityState.Added:
                        auditEntry.NewValues[propertyName] = SanitizeAuditValue(propertyName, property.CurrentValue);
                        break;

                    case EntityState.Deleted:
                        auditEntry.OldValues[propertyName] = SanitizeAuditValue(propertyName, property.OriginalValue);
                        break;

                    case EntityState.Modified:
                        if (property.IsModified)
                        {
                            auditEntry.OldValues[propertyName] = SanitizeAuditValue(propertyName, property.OriginalValue);
                            auditEntry.NewValues[propertyName] = SanitizeAuditValue(propertyName, property.CurrentValue);
                        }
                        break;
                }
            }
        }

        return auditEntries.Where(_ => _.HasAuditData).ToList();
    }

    private void OnAfterSaveChanges(List<AuditEntry> auditEntries)
    {
        if (auditEntries == null || auditEntries.Count == 0) return;

        var userId = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var logs = auditEntries.Select(a => a.ToAuditLog(userId)).ToList();

        try
        {
            AuditLogs.AddRange(logs);
            base.SaveChanges();
        }
        catch (Exception ex)
        {
            // Audit is best-effort: an audit-log failure must never break the business operation.
            DetachAuditLogs(logs);
            Serilog.Log.Warning(ex, "Audit log persistence failed; continuing without audit for this operation.");
        }
    }

    private async Task OnAfterSaveChangesAsync(List<AuditEntry> auditEntries)
    {
        if (auditEntries == null || auditEntries.Count == 0) return;

        var userId = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var logs = auditEntries.Select(a => a.ToAuditLog(userId)).ToList();

        try
        {
            await AuditLogs.AddRangeAsync(logs);
            await base.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Audit is best-effort: an audit-log failure must never break the business operation.
            DetachAuditLogs(logs);
            Serilog.Log.Warning(ex, "Audit log persistence failed; continuing without audit for this operation.");
        }
    }

    private void DetachAuditLogs(List<AuditLog> logs)
    {
        foreach (var log in logs)
        {
            var entry = Entry(log);
            if (entry.State != EntityState.Detached)
            {
                entry.State = EntityState.Detached;
            }
        }
    }

    // Değişiklikleri geçici tutan yardımcı iç sınıf
    private class AuditEntry
    {
        public Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry Entry { get; }
        public string TableName { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public Dictionary<string, object> KeyValues { get; } = new();
        public Dictionary<string, object> OldValues { get; } = new();
        public Dictionary<string, object> NewValues { get; } = new();
        public bool HasAuditData => KeyValues.Any() || OldValues.Any() || NewValues.Any();

        public AuditEntry(Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry entry)
        {
            Entry = entry;
        }

        public AuditLog ToAuditLog(string? userId)
        {
            var options = new JsonSerializerOptions { WriteIndented = false };
            return new AuditLog
            {
                Id = Guid.NewGuid().ToString(),
                UserId = userId,
                EntityName = TableName,
                Action = Action,
                Timestamp = DateTime.UtcNow,
                KeyValues = JsonSerializer.Serialize(KeyValues, options),
                OldValues = OldValues.Any() ? JsonSerializer.Serialize(OldValues, options) : null,
                NewValues = NewValues.Any() ? JsonSerializer.Serialize(NewValues, options) : null
            };
        }
    }
}

