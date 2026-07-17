using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Constants;

namespace GoodTrack.API.Services;

/// <summary>
/// Aylık kredi yenileme job'ı: vadesi gelen (RenewsAt &lt;= şimdi) kayıtlarda bakiyeyi planın
/// aylık kredisine TAMAMLAR — <c>Credits = max(mevcut, planAylık)</c>. Böylece satın alınan
/// kredi paketleri asla silinmez, kullanılmayan aylık krediler de birikmez. RenewsAt, vade
/// yakalanana kadar birer ay ilerletilir (uzun kapalılıkta tek turda güncel vadeye gelir).
///
/// Kayıt sayısı küçük olduğundan (kullanıcı başına 1 satır) tek tek yükleyip kaydetmek
/// yeterlidir; xmin çakışmasında kayıt atlanır, sonraki turda yeniden denenir.
/// </summary>
public sealed class CreditRenewalService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CreditRenewalService> _logger;

    /// <summary>Çok-instance'ta yalnız tek çalıştırıcı için advisory-lock anahtarı (diğer job'lardan farklı).</summary>
    private const long JobLockKey = 481003;

    /// <summary>Vade günün hangi saatinde olursa olsun aynı gün yakalansın diye 6 saatte bir taranır.</summary>
    private static readonly TimeSpan Interval = TimeSpan.FromHours(6);

    public CreditRenewalService(IServiceScopeFactory scopeFactory, ILogger<CreditRenewalService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // İlk tur hemen çalışır (deploy sonrası bekletmeden), sonra periyodik.
        using var timer = new PeriodicTimer(Interval);
        do
        {
            try
            {
                await RenewDueCreditsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // Job hataları uygulamayı düşürmez; bir sonraki turda tekrar denenir.
                _logger.LogError(ex, "Kredi yenileme taraması başarısız oldu.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RenewDueCreditsAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var jobLock = scope.ServiceProvider.GetRequiredService<IJobLock>();
        var creditsRepository = scope.ServiceProvider.GetRequiredService<ICreditsRepository>();

        await jobLock.RunExclusiveAsync(JobLockKey, async ct =>
        {
            var now = DateTime.UtcNow;
            var due = await creditsRepository.GetDueForRenewalAsync(now, ct);
            if (due.Count == 0) return;

            int renewed = 0;
            foreach (var record in due)
            {
                ApplyRenewal(record, now);

                try
                {
                    await creditsRepository.SaveAsync(record, ct);
                    renewed++;
                }
                catch (DbUpdateConcurrencyException)
                {
                    // Eşzamanlı sipariş düşümü/dolum kaydı değiştirdi: bu turda atla,
                    // sonraki turda güncel değerle yeniden denenir.
                    _logger.LogWarning("Kredi yenileme çakışması, kayıt atlandı. UserId: {UserId}", record.UserId);
                }
            }

            if (renewed > 0)
            {
                _logger.LogInformation("Kredi yenileme: {Count} kullanıcının aylık kredisi tazelendi.", renewed);
            }
        }, cancellationToken);
    }

    /// <summary>
    /// Yenileme semantiği (test edilebilir): bakiye planın aylık kredisine TAMAMLANIR
    /// (max — paket kredileri korunur, aylık krediler birikmez); RenewsAt vade yakalanana
    /// kadar birer ay ilerletilir.
    /// </summary>
    internal static void ApplyRenewal(Models.UserCredit record, DateTime nowUtc)
    {
        var plan = SubscriptionPlanCatalog.ResolveOrFree(record.Plan);
        record.Credits = Math.Max(record.Credits, plan.MonthlyCredits);

        while (record.RenewsAt <= nowUtc)
        {
            record.RenewsAt = record.RenewsAt.AddMonths(1);
        }
    }
}
