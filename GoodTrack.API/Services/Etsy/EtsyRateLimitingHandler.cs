using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.RateLimiting;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace GoodTrack.API.Services.Etsy;

/// <summary>
/// Etsy Open API çağrıları için outbound throttle + günlük kota + retry katmanı (DelegatingHandler).
///
/// - <b>Saniyelik throttle:</b> Etsy limiti 10 QPS'tir. Süreç genelinde paylaşılan bir token
///   bucket ile ~8 QPS'e sınırlanır (güvenlik payı). Fazla istek reddedilmez, kuyruğa alınır.
/// - <b>Günlük kota:</b> Etsy uygulama-başına ~10.000 istek/gün limiti uygular. Süreç genelinde
///   UTC-günü bazlı bir sayaç tutulur; kota dolunca gerçek çağrı YAPILMADAN 429 döndürülür
///   (Etsy'ye gereksiz yük bindirilmez, "kötü davranan uygulama" işareti önlenir). Sayaç her
///   UTC gün dönümünde sıfırlanır. Not: çok-instance dağıtımda her instance kendi sayacını
///   tutar; tek-instance kurulumda tam doğrudur, çok-instance'ta limitin biraz altında güvenli
///   kalınması için eşik gerçek limitin altına ayarlanmıştır.
/// - <b>Retry:</b> 429 ve geçici 5xx yanıtlarında, varsa <c>Retry-After</c> başlığına; yoksa
///   jitter'lı exponential backoff'a göre yeniden denenir.
/// </summary>
public sealed class EtsyRateLimitingHandler : DelegatingHandler
{
    // Süreç genelinde tek limiter: tüm Etsy çağrıları aynı bütçeyi paylaşır.
    private static readonly TokenBucketRateLimiter Limiter = new(new TokenBucketRateLimiterOptions
    {
        TokenLimit = 8,
        TokensPerPeriod = 8,
        ReplenishmentPeriod = TimeSpan.FromSeconds(1),
        QueueLimit = 1000,
        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        AutoReplenishment = true
    });

    private const int MaxRetries = 3;

    /// <summary>Günlük sert kota (Etsy'nin ~10.000 limitinin altında güvenlik payı).</summary>
    private const int DailyRequestCap = 9500;

    /// <summary>Bu eşiği aşınca uyarı loglanır (kota dolmadan haberdar olunur).</summary>
    private const int DailyWarnThreshold = 8000;

    // Süreç genelinde paylaşılan günlük sayaç + geçerli olduğu UTC gün.
    private static readonly object DailyLock = new();
    private static DateOnly _dailyWindow = DateOnly.FromDateTime(DateTime.UtcNow);
    private static int _dailyCount;

    private readonly ILogger<EtsyRateLimitingHandler> _logger;
    private readonly TimeSpan _baseBackoff;

    public EtsyRateLimitingHandler(ILogger<EtsyRateLimitingHandler> logger, TimeSpan? baseBackoff = null)
    {
        _logger = logger;
        _baseBackoff = baseBackoff ?? TimeSpan.FromSeconds(1);
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        // Günlük kota kontrolü: dolmuşsa gerçek çağrı yapmadan 429 döndür.
        if (!TryConsumeDailyBudget(out var untilReset))
        {
            _logger.LogWarning("Etsy günlük istek kotası ({Cap}) doldu; çağrı reddedildi. Sıfırlanma: {Reset}", DailyRequestCap, untilReset);
            var throttled = new HttpResponseMessage(HttpStatusCode.TooManyRequests)
            {
                Content = new StringContent("Etsy günlük API kotası doldu. Lütfen daha sonra tekrar deneyin."),
                RequestMessage = request
            };
            throttled.Headers.RetryAfter = new System.Net.Http.Headers.RetryConditionHeaderValue(untilReset);
            return throttled;
        }

        WarnIfNearDailyCap();

        for (var attempt = 0; ; attempt++)
        {
            // 1) QPS bütçesinden bir jeton al (yoksa kuyruğa girip bekler).
            using (var lease = await Limiter.AcquireAsync(1, cancellationToken))
            {
                if (!lease.IsAcquired)
                {
                    _logger.LogWarning("Etsy rate limiter queue is full; sending request without a lease.");
                }

                // Her deneme için isteği klonla — HttpRequestMessage bir kez gönderilebilir.
                var attemptRequest = await CloneRequestAsync(request, cancellationToken);
                var response = await base.SendAsync(attemptRequest, cancellationToken);

                if (!ShouldRetry(response.StatusCode) || attempt >= MaxRetries)
                {
                    return response;
                }

                var delay = GetRetryDelay(response, attempt);
                _logger.LogWarning(
                    "Etsy request to {Path} returned {Status}. Retry {Attempt}/{Max} after {Delay}ms.",
                    request.RequestUri?.PathAndQuery, (int)response.StatusCode, attempt + 1, MaxRetries, delay.TotalMilliseconds);

                response.Dispose();
                await Task.Delay(delay, cancellationToken);
            }
        }
    }

    /// <summary>
    /// Günlük bütçeden bir istek düşer. Gün döndüyse sayaç sıfırlanır. Kota dolmuşsa false
    /// döner ve <paramref name="untilReset"/> gün dönümüne kalan süreyi verir.
    /// </summary>
    private static bool TryConsumeDailyBudget(out TimeSpan untilReset)
    {
        lock (DailyLock)
        {
            var now = DateTime.UtcNow;
            var today = DateOnly.FromDateTime(now);
            if (today != _dailyWindow)
            {
                _dailyWindow = today;
                _dailyCount = 0;
            }

            untilReset = today.AddDays(1).ToDateTime(TimeOnly.MinValue) - now;

            if (_dailyCount >= DailyRequestCap)
            {
                return false;
            }

            _dailyCount++;
            return true;
        }
    }

    /// <summary>Eşiği aşınca (kota dolmadan) uyarı loglar; kilit dışında çağrılır.</summary>
    private void WarnIfNearDailyCap()
    {
        int count;
        lock (DailyLock)
        {
            count = _dailyCount;
        }
        if (count == DailyWarnThreshold)
        {
            _logger.LogWarning("Etsy günlük istek sayısı {Count}/{Cap} eşiğini aştı.", count, DailyRequestCap);
        }
    }

    private static bool ShouldRetry(HttpStatusCode status) =>
        status == HttpStatusCode.TooManyRequests // 429
        || status == HttpStatusCode.InternalServerError // 500
        || status == HttpStatusCode.BadGateway // 502
        || status == HttpStatusCode.ServiceUnavailable // 503
        || status == HttpStatusCode.GatewayTimeout; // 504

    private TimeSpan GetRetryDelay(HttpResponseMessage response, int attempt)
    {
        // Etsy/Svix Retry-After: saniye (delta) veya HTTP-date olabilir.
        var retryAfter = response.Headers.RetryAfter;
        if (retryAfter != null)
        {
            if (retryAfter.Delta is { } delta && delta > TimeSpan.Zero)
            {
                return delta;
            }
            if (retryAfter.Date is { } date)
            {
                var untilDate = date - DateTimeOffset.UtcNow;
                if (untilDate > TimeSpan.Zero)
                {
                    return untilDate;
                }
            }
        }

        // Exponential backoff + jitter: base, 2*base, 4*base ...
        var backoff = _baseBackoff * Math.Pow(2, attempt);
        var jitter = TimeSpan.FromMilliseconds(Random.Shared.Next(0, 250));
        return backoff + jitter;
    }

    private static async Task<HttpRequestMessage> CloneRequestAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var clone = new HttpRequestMessage(request.Method, request.RequestUri) { Version = request.Version };

        foreach (var header in request.Headers)
        {
            clone.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        if (request.Content != null)
        {
            // İçeriği byte'a alıp yeniden kur — orijinal içerik tüketilmeden tekrar denenebilir.
            var bytes = await request.Content.ReadAsByteArrayAsync(cancellationToken);
            clone.Content = new ByteArrayContent(bytes);
            foreach (var header in request.Content.Headers)
            {
                clone.Content.Headers.TryAddWithoutValidation(header.Key, header.Value);
            }
        }

        return clone;
    }
}
