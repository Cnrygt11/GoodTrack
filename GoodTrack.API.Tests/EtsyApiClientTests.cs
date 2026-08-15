using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using GoodTrack.API.DTOs.Etsy;
using GoodTrack.API.Services.Etsy;

namespace GoodTrack.API.Tests;

public class EtsyApiClientTests
{
    private static readonly EtsyCredentials Credentials = new("key", "secret", "123.access");

    /// <summary>
    /// Kuyruğa konan yanıtları sırayla döndüren ve gelen istekleri kaydeden sahte handler.
    /// </summary>
    private sealed class StubHandler : HttpMessageHandler
    {
        private readonly Queue<Func<HttpRequestMessage, HttpResponseMessage>> _responders;
        public List<Uri> Requests { get; } = new();

        public StubHandler(IEnumerable<Func<HttpRequestMessage, HttpResponseMessage>> responders)
        {
            _responders = new Queue<Func<HttpRequestMessage, HttpResponseMessage>>(responders);
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(request.RequestUri!);
            var responder = _responders.Dequeue();
            return Task.FromResult(responder(request));
        }
    }

    private static HttpResponseMessage Json(string body) =>
        new(HttpStatusCode.OK) { Content = new StringContent(body) };

    private static string ListingsPage(int count, IEnumerable<long> ids)
    {
        var results = string.Join(",", ids.Select(id => $"{{\"listing_id\":{id},\"title\":\"L{id}\"}}"));
        return $"{{\"count\":{count},\"results\":[{results}]}}";
    }

    private static EtsyApiClient BuildClient(StubHandler handler)
    {
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.etsy.com/") };
        return new EtsyApiClient(httpClient, Mock.Of<ILogger<EtsyApiClient>>());
    }

    [Fact]
    public async Task GetActiveListings_MoreThanOnePage_AggregatesAllAndUsesOffset()
    {
        // count=150 → ilk sayfa 100 kayıt, ikinci sayfa 50 kayıt
        var firstPage = ListingsPage(150, Enumerable.Range(1, 100).Select(i => (long)i));
        var secondPage = ListingsPage(150, Enumerable.Range(101, 50).Select(i => (long)i));

        var handler = new StubHandler(new Func<HttpRequestMessage, HttpResponseMessage>[]
        {
            _ => Json(firstPage),
            _ => Json(secondPage),
        });
        var client = BuildClient(handler);

        var result = await client.GetActiveListingsAsync("shop-1", Credentials);

        result.Should().NotBeNull();
        result!.Results.Should().HaveCount(150);
        result.Results!.Select(r => r.ListingId).Should().OnlyHaveUniqueItems();

        handler.Requests.Should().HaveCount(2);
        Offset(handler.Requests[0]).Should().Be("0");
        Offset(handler.Requests[1]).Should().Be("100");
    }

    [Fact]
    public async Task GetActiveListings_SinglePage_MakesOneRequest()
    {
        var onlyPage = ListingsPage(30, Enumerable.Range(1, 30).Select(i => (long)i));
        var handler = new StubHandler(new Func<HttpRequestMessage, HttpResponseMessage>[]
        {
            _ => Json(onlyPage),
        });
        var client = BuildClient(handler);

        var result = await client.GetActiveListingsAsync("shop-1", Credentials);

        result!.Results.Should().HaveCount(30);
        handler.Requests.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetActiveListings_FirstPageFails_ReturnsNull()
    {
        var handler = new StubHandler(new Func<HttpRequestMessage, HttpResponseMessage>[]
        {
            _ => new HttpResponseMessage(HttpStatusCode.Unauthorized) { Content = new StringContent("nope") },
        });
        var client = BuildClient(handler);

        var result = await client.GetActiveListingsAsync("shop-1", Credentials);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetActiveListings_SecondPageFails_ReturnsPartialResults()
    {
        var firstPage = ListingsPage(150, Enumerable.Range(1, 100).Select(i => (long)i));
        var handler = new StubHandler(new Func<HttpRequestMessage, HttpResponseMessage>[]
        {
            _ => Json(firstPage),
            _ => new HttpResponseMessage(HttpStatusCode.InternalServerError) { Content = new StringContent("boom") },
        });
        var client = BuildClient(handler);

        var result = await client.GetActiveListingsAsync("shop-1", Credentials);

        result.Should().NotBeNull();
        result!.Results.Should().HaveCount(100); // ilk sayfadan toplananlar korunur
    }

    [Fact]
    public async Task GetReceipt_HtmlEncodedFields_AreDecoded()
    {
        // Etsy metin alanlarını HTML-encoded döndürür: &#39; → ' ve &quot; → "
        var receiptJson = """
        {
          "receipt_id": 9000,
          "name": "Ada O&#39;Brien",
          "first_line": "1 King&#39;s Road",
          "city": "London",
          "country_iso": "GB",
          "transactions": [
            {
              "transaction_id": 501,
              "listing_id": 111,
              "quantity": 1,
              "title": "Necklace 26&quot; Chain",
              "personalization": "Please engrave &quot;Ada&quot;",
              "variations": [
                { "formatted_name": "Buyer&#39;s Note", "formatted_value": "26&quot;" }
              ]
            }
          ]
        }
        """;

        var handler = new StubHandler(new Func<HttpRequestMessage, HttpResponseMessage>[] { _ => Json(receiptJson) });
        var client = BuildClient(handler);

        var receipt = await client.GetReceiptAsync("shop-1", "9000", Credentials);

        receipt.Should().NotBeNull();
        receipt!.Name.Should().Be("Ada O'Brien");
        receipt.FirstLine.Should().Be("1 King's Road");

        var transaction = receipt.Transactions!.Single();
        transaction.Title.Should().Be("Necklace 26\" Chain");
        transaction.Personalization.Should().Be("Please engrave \"Ada\"");

        var variation = transaction.Variations!.Single();
        variation.FormattedName.Should().Be("Buyer's Note");
        variation.FormattedValue.Should().Be("26\"");
    }

    [Fact]
    public async Task GetActiveListings_HtmlEncodedTitles_AreDecoded()
    {
        var page = """
        {"count":1,"results":[{"listing_id":111,"title":"Buyer&#39;s Choice 26&quot; Chain"}]}
        """;
        var handler = new StubHandler(new Func<HttpRequestMessage, HttpResponseMessage>[] { _ => Json(page) });
        var client = BuildClient(handler);

        var result = await client.GetActiveListingsAsync("shop-1", Credentials);

        result!.Results!.Single().Title.Should().Be("Buyer's Choice 26\" Chain");
    }

    [Fact]
    public async Task GetListingsBatch_CallsBatchEndpointWithImages_ParsesImagesOnly()
    {
        var json = """
        {"count":1,"results":[
          {"listing_id":111,"title":"Necklace",
           "images":[{"url_570xN":"https://i.etsystatic.com/1.jpg"}]}
        ]}
        """;
        var handler = new StubHandler(new Func<HttpRequestMessage, HttpResponseMessage>[] { _ => Json(json) });
        var client = BuildClient(handler);

        var result = await client.GetListingsBatchAsync(new long[] { 111, 222 }, Credentials);

        result.Should().NotBeNull();
        var listing = result!.Results!.Single();
        listing.Images!.Single().Url570xN.Should().Be("https://i.etsystatic.com/1.jpg");

        var reqUri = handler.Requests.Single();
        reqUri.PathAndQuery.Should().Contain("listings/batch");
        reqUri.PathAndQuery.Should().Contain("111");
        reqUri.PathAndQuery.Should().Contain("222");
        reqUri.PathAndQuery.Should().Contain("includes=Images");
        reqUri.PathAndQuery.Should().NotContain("Inventory");
    }

    [Fact]
    public async Task GetListingsBatch_EmptyIds_MakesNoRequest()
    {
        var handler = new StubHandler(Array.Empty<Func<HttpRequestMessage, HttpResponseMessage>>());
        var client = BuildClient(handler);

        var result = await client.GetListingsBatchAsync(Array.Empty<long>(), Credentials);

        result!.Results.Should().BeEmpty();
        handler.Requests.Should().BeEmpty();
    }

    [Fact]
    public async Task GetListingsInventoryBatch_FetchesSkuFromDedicatedEndpoint()
    {
        var json = """
        {"results":[
          {"listing_id":111,"products":[{"sku":"NECK-01"}]},
          {"listing_id":222,"products":[{"sku":"RING-02"}]}
        ]}
        """;
        var handler = new StubHandler(new Func<HttpRequestMessage, HttpResponseMessage>[] { _ => Json(json) });
        var client = BuildClient(handler);

        var result = await client.GetListingsInventoryBatchAsync(new long[] { 111, 222 }, Credentials);

        result.Should().NotBeNull();
        result!.Results.Should().HaveCount(2);
        result.Results![0].ListingId.Should().Be(111);
        result.Results[0].Products!.Single().Sku.Should().Be("NECK-01");
        result.Results[1].ListingId.Should().Be(222);
        result.Results[1].Products!.Single().Sku.Should().Be("RING-02");

        var reqUri = handler.Requests.Single();
        reqUri.PathAndQuery.Should().Contain("listings/batch/inventory");
        reqUri.PathAndQuery.Should().Contain("111");
        reqUri.PathAndQuery.Should().Contain("222");
    }

    [Fact]
    public async Task GetListingsInventoryBatch_EmptyIds_MakesNoRequest()
    {
        var handler = new StubHandler(Array.Empty<Func<HttpRequestMessage, HttpResponseMessage>>());
        var client = BuildClient(handler);

        var result = await client.GetListingsInventoryBatchAsync(Array.Empty<long>(), Credentials);

        result.Should().NotBeNull();
        result!.Results.Should().BeEmpty();
        handler.Requests.Should().BeEmpty();
    }

    [Fact]
    public async Task GetListingsInventoryBatch_OnError_ReturnsNull()
    {
        var handler = new StubHandler(new Func<HttpRequestMessage, HttpResponseMessage>[]
        {
            _ => new HttpResponseMessage(System.Net.HttpStatusCode.NotFound)
            {
                Content = new StringContent("{\"error\":\"Not Found\"}")
            }
        });
        var client = BuildClient(handler);

        var result = await client.GetListingsInventoryBatchAsync(new long[] { 999 }, Credentials);

        result.Should().BeNull();
    }

    private static string Offset(Uri uri) => HttpUtility.ParseQueryString(uri.Query)["offset"] ?? "";
}
