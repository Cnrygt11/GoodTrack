using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Etsy;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Models;
using GoodTrack.API.Services;

namespace GoodTrack.API.Tests;

public class EtsyServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;
    private readonly Mock<IEtsyApiClient> _apiClientMock = new();
    private readonly Mock<IEtsyOAuthService> _oauthServiceMock = new();
    private readonly Mock<IEtsyConnectionRepository> _connectionRepositoryMock = new();
    private readonly Mock<IProductService> _productServiceMock = new();
    private readonly Mock<IOrderWorkflowService> _orderWorkflowMock = new();
    private readonly EtsyService _service;

    public EtsyServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;
        var httpContextAccessorMock = new Mock<Microsoft.AspNetCore.Http.IHttpContextAccessor>();
        _context = new AppDbContext(options, httpContextAccessorMock.Object);
        _context.Database.EnsureCreated();

        _service = new EtsyService(
            _context,
            _apiClientMock.Object,
            _oauthServiceMock.Object,
            _connectionRepositoryMock.Object,
            _productServiceMock.Object,
            _orderWorkflowMock.Object,
            Mock.Of<ILogger<EtsyService>>());
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    private static EtsyConnection Connection(DateTime expiresAt) => new()
    {
        UserId = "u1",
        EtsyShopId = "shop-1",
        ApiKeyKeystring = "key",
        ApiKeySharedSecret = "secret",
        AccessToken = "old-access",
        RefreshToken = "old-refresh",
        TokenExpiresAt = expiresAt,
        IsActive = true,
    };

    [Fact]
    public async Task ConsumeOAuthState_UnknownState_ReturnsNull()
    {
        _oauthServiceMock
            .Setup(o => o.ConsumePendingConnectionAsync("bad", It.IsAny<CancellationToken>()))
            .ReturnsAsync((PendingConnectionState?)null);

        var result = await _service.ConsumeOAuthStateAsync("bad");

        result.Should().BeNull();
    }

    [Fact]
    public async Task RefreshAccessToken_ConnectionNotFound_Throws()
    {
        _connectionRepositoryMock
            .Setup(r => r.GetAsync("u1", "shop-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((EtsyConnection?)null);

        var act = () => _service.RefreshAccessTokenAsync("u1", "shop-1");
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task RefreshAccessToken_StillValid_DoesNotCallApi()
    {
        var connection = Connection(DateTime.UtcNow.AddHours(1));
        _connectionRepositoryMock
            .Setup(r => r.GetAsync("u1", "shop-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(connection);

        var result = await _service.RefreshAccessTokenAsync("u1", "shop-1");

        result.AccessToken.Should().Be("old-access");
        _apiClientMock.Verify(
            c => c.RefreshTokenAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task RefreshAccessToken_Expired_RefreshesAndSaves()
    {
        var connection = Connection(DateTime.UtcNow.AddMinutes(-1));
        _connectionRepositoryMock
            .Setup(r => r.GetAsync("u1", "shop-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(connection);
        _apiClientMock
            .Setup(c => c.RefreshTokenAsync("key", "secret", "old-refresh", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EtsyTokenResponse { AccessToken = "new-access", RefreshToken = "new-refresh", ExpiresIn = 3600 });

        var result = await _service.RefreshAccessTokenAsync("u1", "shop-1");

        result.AccessToken.Should().Be("new-access");
        result.RefreshToken.Should().Be("new-refresh");
        result.IsActive.Should().BeTrue();
        _connectionRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RefreshAccessToken_ApiFails_DeactivatesConnectionAndRethrows()
    {
        var connection = Connection(DateTime.UtcNow.AddMinutes(-1));
        _connectionRepositoryMock
            .Setup(r => r.GetAsync("u1", "shop-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(connection);
        _apiClientMock
            .Setup(c => c.RefreshTokenAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Etsy token refresh failed"));

        var act = () => _service.RefreshAccessTokenAsync("u1", "shop-1");
        await act.Should().ThrowAsync<InvalidOperationException>();

        connection.IsActive.Should().BeFalse();
        _connectionRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    private void SeedOrder(string id, long? etsyReceiptId, string sellerId = "u1", string code = "SKU-1")
    {
        _context.Products.Add(new Product
        {
            Id = id,
            Code = code,
            SellerId = sellerId,
            ManufacturerId = "m1",
            Status = "awaiting",
            EtsyReceiptId = etsyReceiptId,
            CreatedAt = DateTime.UtcNow
        });
        _context.SaveChanges();
    }

    private void SeedCatalogProduct(string productCode = "etsy-111")
    {
        _context.CatalogProducts.Add(new CatalogProduct
        {
            Id = "cat-1",
            SellerId = "u1",
            ProductCode = productCode,
            ManufacturerId = "m1",
            ManufacturerName = "Üretici",
            CreatedAt = DateTime.UtcNow.ToString("o"),
        });
        _context.SaveChanges();
    }

    private void SetupReceipt(EtsyReceipt receipt)
    {
        _connectionRepositoryMock
            .Setup(r => r.GetAsync("u1", "shop-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Connection(DateTime.UtcNow.AddHours(1)));

        _apiClientMock
            .Setup(c => c.GetReceiptAsync("shop-1", receipt.ReceiptId.ToString(), It.IsAny<EtsyCredentials>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(receipt);
    }

    [Fact]
    public async Task ProcessEtsyOrderCancellation_CancelsOnlyMatchingReceiptOrders()
    {
        SeedOrder("o1", etsyReceiptId: 999);              // aynı receipt
        SeedOrder("o2", etsyReceiptId: 999);              // aynı receipt
        SeedOrder("o3", etsyReceiptId: 888);              // başka receipt — dokunulmamalı
        SeedOrder("o4", etsyReceiptId: 9990);             // benzer ama farklı sayı — dokunulmamalı
        SeedOrder("o5", etsyReceiptId: 999, sellerId: "other"); // başka satıcı — dokunulmamalı
        SeedOrder("o6", etsyReceiptId: null);             // manuel sipariş — dokunulmamalı

        await _service.ProcessEtsyOrderCancellationAsync("u1", "shop-1", "999");

        _orderWorkflowMock.Verify(s => s.ApplyExternalCancellationAsync("u1", "o1", It.IsAny<string>()), Times.Once);
        _orderWorkflowMock.Verify(s => s.ApplyExternalCancellationAsync("u1", "o2", It.IsAny<string>()), Times.Once);
        _orderWorkflowMock.Verify(s => s.ApplyExternalCancellationAsync("u1", "o3", It.IsAny<string>()), Times.Never);
        _orderWorkflowMock.Verify(s => s.ApplyExternalCancellationAsync("u1", "o4", It.IsAny<string>()), Times.Never);
        _orderWorkflowMock.Verify(s => s.ApplyExternalCancellationAsync(It.IsAny<string>(), "o5", It.IsAny<string>()), Times.Never);
        _orderWorkflowMock.Verify(s => s.ApplyExternalCancellationAsync(It.IsAny<string>(), "o6", It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task ProcessEtsyOrderCancellation_NonNumericReceiptId_DoesNothing()
    {
        SeedOrder("o1", etsyReceiptId: 999);

        await _service.ProcessEtsyOrderCancellationAsync("u1", "shop-1", "not-a-number");

        _orderWorkflowMock.Verify(
            s => s.ApplyExternalCancellationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task ProcessEtsyOrderSync_SameListingDifferentTransactions_CreatesSeparateOrdersWithQuantity()
    {
        // Aynı ürünün (listing 111) farklı ekstra özelliklerle alınması Etsy tarafında
        // iki ayrı transaction olur → GoodTrack'te iki ayrı sipariş oluşmalı, adetler taşınmalı.
        SeedCatalogProduct();
        SetupReceipt(new EtsyReceipt
        {
            ReceiptId = 9000,
            ShopId = 1,
            Name = "Müşteri",
            Transactions = new List<EtsyTransaction>
            {
                new() { TransactionId = 501, ListingId = 111, Quantity = 2, Title = "Ürün A" },
                new() { TransactionId = 502, ListingId = 111, Quantity = 3, Title = "Ürün A" },
            }
        });

        await _service.ProcessEtsyOrderSyncAsync("u1", "shop-1", "9000");

        _productServiceMock.Verify(s => s.CreateOrderAsync(
            "u1", It.IsAny<string>(),
            It.Is<CreateProductDto>(d => d.EtsyTransactionId == 501 && d.Quantity == 2 && d.EtsyReceiptId == 9000),
            It.IsAny<CancellationToken>()), Times.Once);

        _productServiceMock.Verify(s => s.CreateOrderAsync(
            "u1", It.IsAny<string>(),
            It.Is<CreateProductDto>(d => d.EtsyTransactionId == 502 && d.Quantity == 3 && d.EtsyReceiptId == 9000),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ProcessEtsyOrderSync_UsesSkuAsOrderCode_AndOmitsListingTitle()
    {
        SeedCatalogProduct();
        SetupReceipt(new EtsyReceipt
        {
            ReceiptId = 9000,
            Name = "Müşteri",
            Transactions = new List<EtsyTransaction>
            {
                new() { TransactionId = 501, ListingId = 111, Quantity = 1, Sku = "NECKLACE-01", Title = "Uzun Etsy başlığı..." },
            }
        });

        await _service.ProcessEtsyOrderSyncAsync("u1", "shop-1", "9000");

        _productServiceMock.Verify(s => s.CreateOrderAsync(
            "u1", It.IsAny<string>(),
            It.Is<CreateProductDto>(d => d.Code == "NECKLACE-01" && d.Text == null),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ProcessEtsyOrderSync_NoSku_FallsBackToCatalogProductCode()
    {
        SeedCatalogProduct(productCode: "etsy-111");
        SetupReceipt(new EtsyReceipt
        {
            ReceiptId = 9000,
            Name = "Müşteri",
            Transactions = new List<EtsyTransaction>
            {
                new() { TransactionId = 501, ListingId = 111, Quantity = 1, Sku = null, Title = "Başlık" },
            }
        });

        await _service.ProcessEtsyOrderSyncAsync("u1", "shop-1", "9000");

        _productServiceMock.Verify(s => s.CreateOrderAsync(
            "u1", It.IsAny<string>(),
            It.Is<CreateProductDto>(d => d.Code == "etsy-111"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ProcessEtsyOrderSync_StoresCustomerInfoOnFields_NotInExtras()
    {
        SeedCatalogProduct();
        SetupReceipt(new EtsyReceipt
        {
            ReceiptId = 9000,
            Name = "Ada Lovelace",
            FirstLine = "1 Main St",
            SecondLine = "",
            City = "London",
            Zip = "E1",
            CountryIso = "GB",
            Transactions = new List<EtsyTransaction>
            {
                new()
                {
                    TransactionId = 501, ListingId = 111, Quantity = 1, Title = "Ürün",
                    Personalization = "Ada yazsın"
                },
            }
        });

        await _service.ProcessEtsyOrderSyncAsync("u1", "shop-1", "9000");

        _productServiceMock.Verify(s => s.CreateOrderAsync(
            "u1", It.IsAny<string>(),
            It.Is<CreateProductDto>(d =>
                d.CustomerName == "Ada Lovelace" &&
                d.ShippingAddress!.Contains("1 Main St") &&
                d.ShippingAddress.Contains("London") &&
                !d.ShippingAddress.Contains(", ,") &&           // boş satır artefaktı yok
                d.Extras!.ContainsKey("Kişiselleştirme") &&     // üretim bilgisi extras'ta kalır
                !d.Extras.ContainsKey("Müşteri Adı") &&         // PII extras'ta DEĞİL
                !d.Extras.ContainsKey("Adres") &&
                !d.Extras.ContainsKey("Etsy Sipariş No")),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ProcessEtsyOrderSync_ExistingTransaction_IsSkipped()
    {
        SeedCatalogProduct();
        _context.Products.Add(new Product
        {
            Id = "existing",
            Code = "SKU-1",
            SellerId = "u1",
            ManufacturerId = "m1",
            Status = "awaiting",
            EtsyReceiptId = 9000,
            EtsyTransactionId = 501,
            CreatedAt = DateTime.UtcNow
        });
        _context.SaveChanges();

        SetupReceipt(new EtsyReceipt
        {
            ReceiptId = 9000,
            Name = "Müşteri",
            Transactions = new List<EtsyTransaction>
            {
                new() { TransactionId = 501, ListingId = 111, Quantity = 1, Title = "Ürün" },
            }
        });

        await _service.ProcessEtsyOrderSyncAsync("u1", "shop-1", "9000");

        _productServiceMock.Verify(s => s.CreateOrderAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CreateProductDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ProcessEtsyOrderCancellation_NoMatchingOrders_DoesNothing()
    {
        SeedOrder("o1", etsyReceiptId: 111);

        await _service.ProcessEtsyOrderCancellationAsync("u1", "shop-1", "999");

        _orderWorkflowMock.Verify(
            s => s.ApplyExternalCancellationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task FetchAndImportListings_UsesSingleBatch_ForSkuAndImage_NoNPlusOne()
    {
        var connection = Connection(DateTime.UtcNow.AddHours(1));
        _connectionRepositoryMock
            .Setup(r => r.GetActiveForUserAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<EtsyConnection> { connection });
        _connectionRepositoryMock
            .Setup(r => r.GetAsync("u1", "shop-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(connection);

        // active → yalnızca ID'ler (title dahil ama görsel/envanter YOK)
        _apiClientMock
            .Setup(c => c.GetActiveListingsAsync("shop-1", It.IsAny<EtsyCredentials>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EtsyListingsContainer
            {
                Results = new List<EtsyListingResult>
                {
                    new() { ListingId = 111, Title = "A" },
                    new() { ListingId = 222, Title = "B" },
                }
            });

        // batch → görsel + SKU gömülü
        _apiClientMock
            .Setup(c => c.GetListingsBatchAsync(It.IsAny<IEnumerable<long>>(), It.IsAny<EtsyCredentials>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EtsyListingsContainer
            {
                Results = new List<EtsyListingResult>
                {
                    new()
                    {
                        ListingId = 111, Title = "A",
                        Images = new() { new EtsyListingImageResult { Url570xN = "https://img/1.jpg" } },
                        Inventory = new EtsyInventoryContainer { Products = new() { new EtsyInventoryProduct { Sku = "SKU-A" } } }
                    },
                    new()
                    {
                        ListingId = 222, Title = "B",
                        Images = new() { new EtsyListingImageResult { Url570xN = "https://img/2.jpg" } },
                        Inventory = new EtsyInventoryContainer { Products = new() { new EtsyInventoryProduct { Sku = "SKU-B" } } }
                    },
                }
            });

        var result = await _service.FetchAndImportEtsyListingsAsync("u1");

        result.Should().HaveCount(2);

        // Tüm listing'ler için TEK batch çağrısı (100'lük tek chunk) — N+1 yok
        _apiClientMock.Verify(
            c => c.GetListingsBatchAsync(It.IsAny<IEnumerable<long>>(), It.IsAny<EtsyCredentials>(), It.IsAny<CancellationToken>()),
            Times.Once);

        // SKU'lar batch envanterinden geldi; görseller base64 indirilmek yerine CDN URL olarak saklandı
        _apiClientMock.Verify(
            c => c.DownloadImageAsBase64Async(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);

        var products = _context.CatalogProducts.Where(p => p.SellerId == "u1").ToList();
        products.Select(p => p.ProductCode).Should().BeEquivalentTo(new[] { "SKU-A", "SKU-B" });
        products.Should().Contain(p => p.ProductCode == "SKU-A" && p.Image == "https://img/1.jpg");
        products.Should().Contain(p => p.ProductCode == "SKU-B" && p.Image == "https://img/2.jpg");
    }

    private void SetupSingleListingSync(string sku, string imageUrl)
    {
        var connection = Connection(DateTime.UtcNow.AddHours(1));
        _connectionRepositoryMock
            .Setup(r => r.GetActiveForUserAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<EtsyConnection> { connection });
        _connectionRepositoryMock
            .Setup(r => r.GetAsync("u1", "shop-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(connection);
        _apiClientMock
            .Setup(c => c.GetActiveListingsAsync("shop-1", It.IsAny<EtsyCredentials>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EtsyListingsContainer { Results = new List<EtsyListingResult> { new() { ListingId = 111, Title = "A" } } });
        _apiClientMock
            .Setup(c => c.GetListingsBatchAsync(It.IsAny<IEnumerable<long>>(), It.IsAny<EtsyCredentials>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EtsyListingsContainer
            {
                Results = new List<EtsyListingResult>
                {
                    new()
                    {
                        ListingId = 111, Title = "A",
                        Images = new() { new EtsyListingImageResult { Url570xN = imageUrl } },
                        Inventory = new EtsyInventoryContainer { Products = new() { new EtsyInventoryProduct { Sku = sku } } }
                    }
                }
            });
        _apiClientMock
            .Setup(c => c.DownloadImageAsBase64Async(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("data:image/jpeg;base64,NEW");
    }

    private void SeedCatalogWithImage(string image)
    {
        _context.CatalogProducts.Add(new CatalogProduct
        {
            Id = "cat-1",
            SellerId = "u1",
            ProductCode = "SKU-A",
            Image = image,
            CreatedAt = DateTime.UtcNow.ToString("o"),
            Extras = new Dictionary<string, ExtraValue>
            {
                { "etsy_listing_id", new ExtraValue { Name = "Etsy Listing ID", Type = "text", Value = "111" } }
            }
        });
        _context.SaveChanges();
    }

    [Fact]
    public async Task FetchAndImportListings_ExistingProduct_StoresCurrentUrl_NoDownload()
    {
        // Artık görsel indirilmez: mevcut ürünün görseli her senkronda güncel CDN URL'sine yenilenir.
        SeedCatalogWithImage("data:image/jpeg;base64,OLD");
        SetupSingleListingSync(sku: "SKU-A", imageUrl: "https://img/1.jpg");

        await _service.FetchAndImportEtsyListingsAsync("u1");

        _apiClientMock.Verify(
            c => c.DownloadImageAsBase64Async(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _context.CatalogProducts.Single(p => p.ProductCode == "SKU-A").Image.Should().Be("https://img/1.jpg");
    }

    [Fact]
    public async Task FetchAndImportListings_MissingImage_StoresUrl_NoDownload()
    {
        // Görsel yoksa da indirmek yerine doğrudan CDN URL'si saklanır.
        SeedCatalogWithImage(string.Empty);
        SetupSingleListingSync(sku: "SKU-A", imageUrl: "https://img/1.jpg");

        await _service.FetchAndImportEtsyListingsAsync("u1");

        _apiClientMock.Verify(
            c => c.DownloadImageAsBase64Async(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _context.CatalogProducts.Single(p => p.ProductCode == "SKU-A").Image.Should().Be("https://img/1.jpg");
    }

    [Fact]
    public async Task GetConnectionsAsync_DelegatesToRepository()
    {
        var expected = new List<EtsyConnection> { Connection(DateTime.UtcNow.AddHours(1)) };
        _connectionRepositoryMock
            .Setup(r => r.GetAllForUserAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        var result = await _service.GetConnectionsAsync("u1");

        result.Should().BeSameAs(expected);
    }
}
