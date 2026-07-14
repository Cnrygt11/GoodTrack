using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Constants;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Infrastructure.Repositories;
using GoodTrack.API.Models;
using GoodTrack.API.Services;
using GoodTrack.API.Hubs;

namespace GoodTrack.API.Tests;

public class ProductServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;
    private readonly PostgresProductRepository _productRepository;
    private readonly PostgresCreditsRepository _creditsRepository;
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly Mock<IUserConnectionRepository> _userConnectionRepositoryMock;
    private readonly Mock<IImageStorageService> _imageStorageServiceMock;
    private readonly CreditsService _creditsService;
    private readonly ProductService _productService;

    public ProductServiceTests()
    {
        // Setup SQLite In-Memory Database
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        var httpContextAccessorMock = new Moq.Mock<Microsoft.AspNetCore.Http.IHttpContextAccessor>();
        _context = new AppDbContext(options, httpContextAccessorMock.Object);
        _context.Database.EnsureCreated();

        _productRepository = new PostgresProductRepository(_context);
        _creditsRepository = new PostgresCreditsRepository(_context);
        _creditsService = new CreditsService(_creditsRepository);

        _userRepositoryMock = new Mock<IUserRepository>();
        _userConnectionRepositoryMock = new Mock<IUserConnectionRepository>();
        _imageStorageServiceMock = new Mock<IImageStorageService>();

        _productService = new ProductService(
            _productRepository,
            new PostgresCatalogRepository(_context),
            _userRepositoryMock.Object,
            _userConnectionRepositoryMock.Object,
            Mock.Of<INotificationService>(),
            _imageStorageServiceMock.Object,
            Mock.Of<IImageCleanupService>(),
            _creditsService,
            _context,
            Mock.Of<Microsoft.Extensions.Logging.ILogger<ProductService>>());
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Close();
        _connection.Dispose();
    }

    [Fact]
    public async Task CreateOrderAsync_EverythingSucceeds_ShouldDeductCreditAndSaveOrder()
    {
        // Arrange
        var sellerId = "seller-1";
        var mfrId = "mfr-1";

        // Setup user first to satisfy foreign key
        var user = new User
        {
            Id = sellerId,
            Username = "seller_one",
            PasswordHash = "hash",
            Role = Roles.Seller
        };
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        // Setup user credits
        var userCredit = new UserCredit
        {
            UserId = sellerId,
            Plan = SubscriptionPlan.Free,
            Credits = 5
        };
        await _creditsRepository.SaveAsync(userCredit);

        // Setup manufacturer validation mocks
        var mfrUser = new User
        {
            Id = mfrId,
            Username = "mfr_one",
            Role = Roles.Mfr
        };
        _userRepositoryMock
            .Setup(r => r.GetByIdAsync(mfrId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(mfrUser);

        _userConnectionRepositoryMock
            .Setup(r => r.AreConnectedAsync(sellerId, mfrId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        _imageStorageServiceMock
            .Setup(s => s.StoreImageAsync(It.IsAny<string?>()))
            .ReturnsAsync("http://stored-image-url.com/img.png");

        var dto = new CreateProductDto
        {
            Code = "PROD-100",
            Image = "data:image/png;base64,mock",
            Text = "Order details",
            Length = "10m",
            ManufacturerId = mfrId,
            ManufacturerName = "Mfr One"
        };

        // Act
        var result = await _productService.CreateOrderAsync(sellerId, "Seller One", dto);

        // Assert
        result.Should().NotBeNull();
        result.Code.Should().Be("PROD-100");
        result.Image.Should().Be("http://stored-image-url.com/img.png");

        _context.ChangeTracker.Clear();

        // Verify credit was deducted
        var updatedCredit = await _creditsRepository.GetByUserIdAsync(sellerId);
        updatedCredit!.Credits.Should().Be(4);

        // Verify product was saved in DB
        var savedProduct = await _productRepository.GetByIdAsync(result.Id);
        savedProduct.Should().NotBeNull();
        savedProduct!.Code.Should().Be("PROD-100");
    }

    [Fact]
    public async Task CreateOrderAsync_ImageStoreFails_ShouldRollbackCreditDeduction()
    {
        // Arrange
        var sellerId = "seller-2";
        var mfrId = "mfr-2";

        // Setup user first to satisfy foreign key
        var user = new User
        {
            Id = sellerId,
            Username = "seller_two",
            PasswordHash = "hash",
            Role = Roles.Seller
        };
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        // Setup user credits
        var userCredit = new UserCredit
        {
            UserId = sellerId,
            Plan = SubscriptionPlan.Free,
            Credits = 5
        };
        await _creditsRepository.SaveAsync(userCredit);

        // Setup manufacturer validation mocks
        var mfrUser = new User
        {
            Id = mfrId,
            Username = "mfr_two",
            Role = Roles.Mfr
        };
        _userRepositoryMock
            .Setup(r => r.GetByIdAsync(mfrId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(mfrUser);

        _userConnectionRepositoryMock
            .Setup(r => r.AreConnectedAsync(sellerId, mfrId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Force Image Storage to throw exception
        _imageStorageServiceMock
            .Setup(s => s.StoreImageAsync(It.IsAny<string?>()))
            .ThrowsAsync(new Exception("Storage error"));

        var dto = new CreateProductDto
        {
            Code = "PROD-200",
            Image = "data:image/png;base64,mock",
            Text = "Order details",
            Length = "10m",
            ManufacturerId = mfrId,
            ManufacturerName = "Mfr One"
        };

        // Act & Assert
        var act = () => _productService.CreateOrderAsync(sellerId, "Seller One", dto);
        await act.Should().ThrowAsync<Exception>().WithMessage("Storage error");

        _context.ChangeTracker.Clear();

        // Verify credit was rolled back (remains 5)
        var updatedCredit = await _creditsRepository.GetByUserIdAsync(sellerId);
        updatedCredit!.Credits.Should().Be(5);

        // Verify no product was saved
        var products = await _context.Products.Where(p => p.SellerId == sellerId).ToListAsync();
        products.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateOrderAsync_ManufacturerNotConnected_ShouldThrowUnauthorizedAccessException()
    {
        // Arrange
        var sellerId = "seller-3";
        var mfrId = "mfr-3";

        var user = new User { Id = sellerId, Username = "seller_three", PasswordHash = "hash", Role = Roles.Seller };
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        var userCredit = new UserCredit { UserId = sellerId, Plan = SubscriptionPlan.Free, Credits = 5 };
        await _creditsRepository.SaveAsync(userCredit);

        var mfrUser = new User { Id = mfrId, Username = "mfr_three", Role = Roles.Mfr };
        _userRepositoryMock
            .Setup(r => r.GetByIdAsync(mfrId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(mfrUser);

        _userConnectionRepositoryMock
            .Setup(r => r.AreConnectedAsync(sellerId, mfrId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var dto = new CreateProductDto
        {
            Code = "PROD-300",
            ManufacturerId = mfrId,
            ManufacturerName = "Mfr Three"
        };

        // Act & Assert
        var act = () => _productService.CreateOrderAsync(sellerId, "Seller Three", dto);
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*bağlantılı*");
    }

    [Fact]
    public async Task CreateOrderAsync_ManufacturerNotFound_ShouldThrowArgumentException()
    {
        // Arrange
        var sellerId = "seller-4";
        var mfrId = "mfr-nonexistent";

        var user = new User { Id = sellerId, Username = "seller_four", PasswordHash = "hash", Role = Roles.Seller };
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        var userCredit = new UserCredit { UserId = sellerId, Plan = SubscriptionPlan.Free, Credits = 5 };
        await _creditsRepository.SaveAsync(userCredit);

        _userRepositoryMock
            .Setup(r => r.GetByIdAsync(mfrId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var dto = new CreateProductDto
        {
            Code = "PROD-400",
            ManufacturerId = mfrId,
            ManufacturerName = "Unknown"
        };

        // Act & Assert
        var act = () => _productService.CreateOrderAsync(sellerId, "Seller Four", dto);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*üretici bulunamadı*");
    }

    // ── Müşteri bilgisi gizliliği ────────────────────────────────────────────
    // Etsy siparişlerinde müşteri adı ve teslimat adresi saklanır ama ÜRETİCİYE
    // gönderilen yanıtlarda asla yer almamalıdır (UI'da gizlemek yeterli değil).

    private Product SeedEtsyOrder(string sellerId = "seller-pii", string mfrId = "mfr-pii")
    {
        var product = new Product
        {
            Id = "order-pii",
            Code = "NECKLACE-01",
            SellerId = sellerId,
            ManufacturerId = mfrId,
            SellerName = "Seller",
            ManufacturerName = "Mfr",
            Status = OrderStatus.Awaiting,
            EtsyReceiptId = 4107987442,
            EtsyTransactionId = 4532071610,
            CustomerName = "Ada Lovelace",
            ShippingAddress = "1 Main St, London, GB",
            CreatedAt = DateTime.UtcNow
        };
        _context.Products.Add(product);
        _context.SaveChanges();
        return product;
    }

    [Fact]
    public async Task GetUserProducts_AsSeller_IncludesCustomerInfoAndEtsyReceiptId()
    {
        SeedEtsyOrder();

        var result = await _productService.GetUserProductsAsync("seller-pii", Roles.Seller);

        result.Should().ContainSingle();
        result[0].CustomerName.Should().Be("Ada Lovelace");
        result[0].ShippingAddress.Should().Be("1 Main St, London, GB");
        result[0].EtsyReceiptId.Should().Be(4107987442);
        result[0].Code.Should().Be("NECKLACE-01");
    }

    [Fact]
    public async Task GetUserProducts_AsManufacturer_HidesCustomerNameAndAddress()
    {
        SeedEtsyOrder();

        var result = await _productService.GetUserProductsAsync("mfr-pii", Roles.Mfr);

        result.Should().ContainSingle();
        result[0].CustomerName.Should().BeNull();
        result[0].ShippingAddress.Should().BeNull();
        // Etsy sipariş no ve SKU üretici için gerekli; gizlenmez.
        result[0].EtsyReceiptId.Should().Be(4107987442);
        result[0].Code.Should().Be("NECKLACE-01");
    }

    [Fact]
    public async Task GetProductById_AsManufacturer_HidesCustomerNameAndAddress()
    {
        SeedEtsyOrder();

        var result = await _productService.GetProductByIdAsync("mfr-pii", Roles.Mfr, "order-pii");

        result.Should().NotBeNull();
        result!.CustomerName.Should().BeNull();
        result.ShippingAddress.Should().BeNull();
    }

    [Fact]
    public async Task GetProductById_AsSeller_IncludesCustomerNameAndAddress()
    {
        SeedEtsyOrder();

        var result = await _productService.GetProductByIdAsync("seller-pii", Roles.Seller, "order-pii");

        result.Should().NotBeNull();
        result!.CustomerName.Should().Be("Ada Lovelace");
        result.ShippingAddress.Should().Be("1 Main St, London, GB");
    }
}
