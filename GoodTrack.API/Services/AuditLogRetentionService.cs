using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Infrastructure;

namespace GoodTrack.API.Services;

/// <summary>
/// Eski audit log kayıtlarını <see cref="RetentionMonths"/> ay sonra toplu silen arka plan servisi.
///
/// Gerekçe: <c>audit_logs</c> her mutasyonda satır ürettiğinden retention olmadan sınırsız büyür.
/// İhtilaf/denetim penceresi kadar tutulur, sonrası temizlenir; böylece tablo sabit bir tavana oturur.
///
/// Audit'in repository soyutlaması olmadığından servis, scope'ta <see cref="AppDbContext"/>'i çözüp
/// doğrudan <c>ExecuteDeleteAsync</c> ile temizler (satırları belleğe yüklemeden). Silme sorgusu
/// <c>audit_logs.Timestamp</c> indeksinden yararlanır.
/// </summary>
public sealed class AuditLogRetentionService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AuditLogRetentionService> _logger;

    /// <summary>Audit kaydının tutulacağı ay sayısı.</summary>
    private const int RetentionMonths = 3;

    /// <summary>Çok-instance'ta yalnız tek çalıştırıcı için advisory-lock anahtarı.</summary>
    private const long JobLockKey = 481001;

    /// <summary>Tarama sıklığı. İş idempotent olduğundan günde bir tur yeterli.</summary>
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);

    public AuditLogRetentionService(
        IServiceScopeFactory scopeFactory,
        ILogger<AuditLogRetentionService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // İlk tur hemen çalışır (deploy sonrası 24 saat beklemeden), sonra periyodik.
        using var timer = new PeriodicTimer(Interval);
        do
        {
            try
            {
                await PurgeExpiredAuditLogsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // Job hataları uygulamayı düşürmez; bir sonraki turda tekrar denenir.
                _logger.LogError(ex, "Audit log retention taraması başarısız oldu.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task PurgeExpiredAuditLogsAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var jobLock = scope.ServiceProvider.GetRequiredService<IJobLock>();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Çok-instance dağıtımda yalnız kilidi alan instance temizliği yapar.
        await jobLock.RunExclusiveAsync(JobLockKey, async ct =>
        {
            var cutoff = DateTime.UtcNow.AddMonths(-RetentionMonths);
            var affected = await PurgeAsync(db, cutoff, ct);

            if (affected > 0)
            {
                _logger.LogInformation(
                    "Retention: {Count} eski audit log kaydı silindi (tutma {RetentionMonths} ay).",
                    affected, RetentionMonths);
            }
        }, cancellationToken);
    }

    /// <summary>
    /// <paramref name="cutoffUtc"/> tarihinden eski audit kayıtlarını toplu siler (test edilebilir çekirdek).
    /// </summary>
    public static Task<int> PurgeAsync(AppDbContext db, DateTime cutoffUtc, CancellationToken cancellationToken = default)
    {
        return db.AuditLogs
            .Where(a => a.Timestamp < cutoffUtc)
            .ExecuteDeleteAsync(cancellationToken);
    }
}
