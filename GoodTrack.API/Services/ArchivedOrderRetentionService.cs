using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;

namespace GoodTrack.API.Services;

/// <summary>
/// Arşive düşen (kargolandı/iptal) siparişleri, yaşam döngüsü sona erdikten
/// <see cref="SlimAfterDays"/> gün sonra "başkalaştıran" arka plan servisi: ağır alanlar
/// (base64 görseller, katalog referansı) ve müşteri PII'ı (ad, adres) kalıcı temizlenir,
/// sipariş minimum veriyle (kod, durum, adet, tarihler, taraflar, extras, loglar)
/// süresiz saklanır ve arşiv sayfasında görünmeye devam eder.
///
/// Gerekçe: ilk 30 gün olası ihtilaf/iade penceresidir — görsel ve müşteri bilgisi tam durur.
/// Sonrasında geçmiş kaydı değerlidir ama ağır veri değildir; küçültme hem depolamayı sınırlar
/// hem müşteri PII'ının süresiz tutulmasını (KVKK/GDPR) önler. Hata/kusur görselleri de aynı
/// turda temizlendiğinden ayrı bir defect-image job'ına gerek kalmaz.
///
/// Görseller satır içinde (base64) tutulduğundan temizlik kolonları null yapmaktır; harici
/// blob temizliği gerekmez. Toplu <c>ExecuteUpdateAsync</c> ile satırlar belleğe yüklenmeden
/// doğrudan DB'de güncellenir.
/// </summary>
public sealed class ArchivedOrderRetentionService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ArchivedOrderRetentionService> _logger;

    /// <summary>Sipariş arşivlendikten sonra tam veriyle tutulacağı gün sayısı.</summary>
    private const int SlimAfterDays = 30;

    /// <summary>Çok-instance'ta yalnız tek çalıştırıcı için advisory-lock anahtarı.</summary>
    private const long JobLockKey = 481002;

    /// <summary>Tarama sıklığı. İş idempotent olduğundan günde bir tur yeterli.</summary>
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);

    public ArchivedOrderRetentionService(
        IServiceScopeFactory scopeFactory,
        ILogger<ArchivedOrderRetentionService> logger)
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
                await SlimExpiredArchivedOrdersAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // Job hataları uygulamayı düşürmez; bir sonraki turda tekrar denenir.
                _logger.LogError(ex, "Arşivlenmiş sipariş küçültme taraması başarısız oldu.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task SlimExpiredArchivedOrdersAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var jobLock = scope.ServiceProvider.GetRequiredService<IJobLock>();
        var productRepository = scope.ServiceProvider.GetRequiredService<IProductRepository>();

        // Çok-instance dağıtımda yalnız kilidi alan instance temizliği yapar.
        await jobLock.RunExclusiveAsync(JobLockKey, async ct =>
        {
            var cutoff = DateTime.UtcNow.AddDays(-SlimAfterDays);
            var affected = await productRepository.SlimOrdersArchivedBeforeAsync(cutoff, ct);

            if (affected > 0)
            {
                _logger.LogInformation(
                    "Retention: {Count} arşivlenmiş sipariş küçültüldü (görseller + müşteri bilgisi temizlendi, {SlimAfterDays} gün).",
                    affected, SlimAfterDays);
            }
        }, cancellationToken);
    }
}
