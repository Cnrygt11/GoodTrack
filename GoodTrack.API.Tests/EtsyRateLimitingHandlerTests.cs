using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using GoodTrack.API.Services.Etsy;

namespace GoodTrack.API.Tests;

/// <summary>
/// Etsy outbound throttle + retry handler'ının davranışını doğrular:
/// 429/5xx'te yeniden dener (Retry-After'a saygılı), başarıda/4xx'te denemez,
/// POST gövdesini retry'larda korur.
/// </summary>
public class EtsyRateLimitingHandlerTests
{
    /// <summary>Kuyruğa alınmış yanıtları sırayla döndüren, istekleri kaydeden sahte inner handler.</summary>
    private sealed class StubInnerHandler : HttpMessageHandler
    {
        private readonly Queue<Func<HttpRequestMessage, HttpResponseMessage>> _responders;
        public int CallCount { get; private set; }
        public List<string?> ReceivedBodies { get; } = new();

        public StubInnerHandler(params Func<HttpRequestMessage, HttpResponseMessage>[] responders)
        {
            _responders = new Queue<Func<HttpRequestMessage, HttpResponseMessage>>(responders);
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            ReceivedBodies.Add(request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken));
            var responder = _responders.Count > 1 ? _responders.Dequeue() : _responders.Peek();
            return responder(request);
        }
    }

    private static HttpClient BuildClient(StubInnerHandler inner)
    {
        // Testlerin hızlı olması için minik backoff.
        var handler = new EtsyRateLimitingHandler(Mock.Of<ILogger<EtsyRateLimitingHandler>>(), baseBackoff: TimeSpan.FromMilliseconds(1))
        {
            InnerHandler = inner
        };
        return new HttpClient(handler) { BaseAddress = new Uri("https://api.etsy.com/") };
    }

    private static HttpResponseMessage Status(HttpStatusCode code, TimeSpan? retryAfter = null)
    {
        var response = new HttpResponseMessage(code);
        if (retryAfter != null)
        {
            response.Headers.RetryAfter = new System.Net.Http.Headers.RetryConditionHeaderValue(retryAfter.Value);
        }
        return response;
    }

    [Fact]
    public async Task Success_IsReturnedWithoutRetry()
    {
        var inner = new StubInnerHandler(_ => Status(HttpStatusCode.OK));
        var client = BuildClient(inner);

        var response = await client.GetAsync("v3/application/shops/1/receipts");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        inner.CallCount.Should().Be(1);
    }

    [Fact]
    public async Task TooManyRequests_ThenSuccess_IsRetried()
    {
        var inner = new StubInnerHandler(
            _ => Status(HttpStatusCode.TooManyRequests, retryAfter: TimeSpan.Zero),
            _ => Status(HttpStatusCode.OK));
        var client = BuildClient(inner);

        var response = await client.GetAsync("v3/application/shops/1/listings/active");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        inner.CallCount.Should().Be(2);
    }

    [Fact]
    public async Task ServerError_ThenSuccess_IsRetried()
    {
        var inner = new StubInnerHandler(
            _ => Status(HttpStatusCode.ServiceUnavailable),
            _ => Status(HttpStatusCode.OK));
        var client = BuildClient(inner);

        var response = await client.GetAsync("v3/application/shops/1");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        inner.CallCount.Should().Be(2);
    }

    [Fact]
    public async Task PersistentTooManyRequests_StopsAfterMaxRetries()
    {
        // Her zaman 429 → 1 ilk deneme + 3 retry = 4 çağrı, sonra 429 döner.
        var inner = new StubInnerHandler(_ => Status(HttpStatusCode.TooManyRequests, retryAfter: TimeSpan.Zero));
        var client = BuildClient(inner);

        var response = await client.GetAsync("v3/application/shops/1/receipts");

        response.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        inner.CallCount.Should().Be(4);
    }

    [Fact]
    public async Task ClientError_IsNotRetried()
    {
        // 401 gibi kalıcı istemci hataları yeniden denenmez.
        var inner = new StubInnerHandler(_ => Status(HttpStatusCode.Unauthorized));
        var client = BuildClient(inner);

        var response = await client.GetAsync("v3/application/shops/1");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        inner.CallCount.Should().Be(1);
    }

    [Fact]
    public async Task PostBody_IsPreservedAcrossRetries()
    {
        var inner = new StubInnerHandler(
            _ => Status(HttpStatusCode.TooManyRequests, retryAfter: TimeSpan.Zero),
            _ => Status(HttpStatusCode.OK));
        var client = BuildClient(inner);

        var content = new StringContent("grant_type=refresh_token&code=abc", Encoding.UTF8);
        await client.PostAsync("v3/public/oauth/token", content);

        inner.CallCount.Should().Be(2);
        inner.ReceivedBodies.Should().OnlyContain(b => b == "grant_type=refresh_token&code=abc");
    }
}
