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
/// Etsy Open API çağrıları için outbound throttle + retry katmanı (DelegatingHandler).
///
/// - <b>Throttle:</b> Etsy limiti 10 QPS'tir. Süreç genelinde paylaşılan bir token bucket
///   ile ~8 QPS'e sınırlanır (güvenlik payı). Fazla istek reddedilmez, kuyruğa alınır —
///   çağıranlar (listing içe aktarımı gibi N+1 iş akışları) doğal olarak yavaşlatılır.
/// - <b>Retry:</b> 429 (Too Many Requests) ve geçici 5xx yanıtlarında, varsa <c>Retry-After</c>
///   başlığına; yoksa jitter'lı exponential backoff'a göre yeniden denenir.
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

    private readonly ILogger<EtsyRateLimitingHandler> _logger;
    private readonly TimeSpan _baseBackoff;

    public EtsyRateLimitingHandler(ILogger<EtsyRateLimitingHandler> logger, TimeSpan? baseBackoff = null)
    {
        _logger = logger;
        _baseBackoff = baseBackoff ?? TimeSpan.FromSeconds(1);
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
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
