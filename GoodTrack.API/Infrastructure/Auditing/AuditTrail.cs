using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Auditing;

/// <summary>
/// Audit-log alt sistemi: SaveChanges öncesi değişiklikleri toplar, sonrasında audit_logs'a
/// yazar. Best-effort çalışır — audit hatası iş operasyonunu ASLA bozmaz (geçmişte tablo
/// yokken her isteği 500'leyen bug'ın kalıcı dersi). AppDbContext'in SaveChanges
/// override'larından çağrılır; DbContext'in kendisi yalın kalır.
/// </summary>
public static class AuditTrail
{
    /// <summary>
    /// Audit'e tam değeri yazılmayacak ağır (base64 görsel) alanlar. İçerik yerine "[omitted]"
    /// işaretçisi yazılır: "alan değişti" bilgisi korunur ama MB'lık base64 kopyalanmaz.
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

    /// <summary>SaveChanges ÖNCESİ çağrılır; audit'lenecek değişiklikleri toplar.</summary>
    public static List<AuditEntry> Collect(ChangeTracker changeTracker)
    {
        changeTracker.DetectChanges();
        var auditEntries = new List<AuditEntry>();

        foreach (var entry in changeTracker.Entries())
        {
            if (entry.Entity is AuditLog || entry.State == EntityState.Detached || entry.State == EntityState.Unchanged)
                continue;

            var auditEntry = new AuditEntry
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

        return auditEntries.Where(a => a.HasAuditData).ToList();
    }

    /// <summary>
    /// SaveChanges SONRASI çağrılır; toplanan girdileri audit_logs'a yazar (best-effort).
    /// Yeniden giren SaveChanges çağrısı yalnız AuditLog entity'lerini görür ve Collect
    /// onları atladığından ikinci bir audit turu oluşmaz.
    /// </summary>
    public static async Task PersistAsync(AppDbContext context, List<AuditEntry> auditEntries, string? userId)
    {
        if (auditEntries == null || auditEntries.Count == 0) return;

        var logs = auditEntries.Select(a => a.ToAuditLog(userId)).ToList();

        try
        {
            await context.AuditLogs.AddRangeAsync(logs);
            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Audit is best-effort: an audit-log failure must never break the business operation.
            DetachAuditLogs(context, logs);
            Serilog.Log.Warning(ex, "Audit log persistence failed; continuing without audit for this operation.");
        }
    }

    /// <summary>Senkron eşdeğer (SaveChanges yolu).</summary>
    public static void Persist(AppDbContext context, List<AuditEntry> auditEntries, string? userId)
    {
        if (auditEntries == null || auditEntries.Count == 0) return;

        var logs = auditEntries.Select(a => a.ToAuditLog(userId)).ToList();

        try
        {
            context.AuditLogs.AddRange(logs);
            context.SaveChanges();
        }
        catch (Exception ex)
        {
            // Audit is best-effort: an audit-log failure must never break the business operation.
            DetachAuditLogs(context, logs);
            Serilog.Log.Warning(ex, "Audit log persistence failed; continuing without audit for this operation.");
        }
    }

    private static void DetachAuditLogs(AppDbContext context, List<AuditLog> logs)
    {
        foreach (var log in logs)
        {
            var entry = context.Entry(log);
            if (entry.State != EntityState.Detached)
            {
                entry.State = EntityState.Detached;
            }
        }
    }
}

/// <summary>Kaydedilecek bir audit değişikliğinin geçici temsili.</summary>
public sealed class AuditEntry
{
    public string TableName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public Dictionary<string, object> KeyValues { get; } = new();
    public Dictionary<string, object> OldValues { get; } = new();
    public Dictionary<string, object> NewValues { get; } = new();
    public bool HasAuditData => KeyValues.Any() || OldValues.Any() || NewValues.Any();

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
