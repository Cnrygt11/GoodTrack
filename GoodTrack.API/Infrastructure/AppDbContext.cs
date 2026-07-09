using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Models;
using GoodTrack.API.Infrastructure.Configurations;

using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace GoodTrack.API.Infrastructure;

public sealed class AppDbContext : DbContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AppDbContext(DbContextOptions<AppDbContext> options, IHttpContextAccessor httpContextAccessor) : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
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
    }

    public override int SaveChanges()
    {
        var auditEntries = OnBeforeSaveChanges();
        var result = base.SaveChanges();
        OnAfterSaveChanges(auditEntries);
        return result;
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var auditEntries = OnBeforeSaveChanges();
        var result = await base.SaveChangesAsync(cancellationToken);
        await OnAfterSaveChangesAsync(auditEntries);
        return result;
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
                        auditEntry.NewValues[propertyName] = property.CurrentValue ?? "NULL";
                        break;

                    case EntityState.Deleted:
                        auditEntry.OldValues[propertyName] = property.OriginalValue ?? "NULL";
                        break;

                    case EntityState.Modified:
                        if (property.IsModified)
                        {
                            auditEntry.OldValues[propertyName] = property.OriginalValue ?? "NULL";
                            auditEntry.NewValues[propertyName] = property.CurrentValue ?? "NULL";
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

        foreach (var auditEntry in auditEntries)
        {
            AuditLogs.Add(auditEntry.ToAuditLog(userId));
        }
        base.SaveChanges();
    }

    private async Task OnAfterSaveChangesAsync(List<AuditEntry> auditEntries)
    {
        if (auditEntries == null || auditEntries.Count == 0) return;

        var userId = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        foreach (var auditEntry in auditEntries)
        {
            AuditLogs.Add(auditEntry.ToAuditLog(userId));
        }
        await base.SaveChangesAsync();
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

