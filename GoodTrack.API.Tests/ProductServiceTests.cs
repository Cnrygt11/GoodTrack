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
    private readonly Mock<ICatalogRepository> _catalogRepositoryMock;
    private readonly Mock<IHubContext<TrackingHub>> _hubContextMock;
    private readonly Mock<IClientProxy> _clientProxyMock;
    private readonly Mock<IHubClients> _hubClientsMock;
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

        _context = new AppDbContext(options);
        _context.Database.EnsureCreated();

        _productRepository = new PostgresProductRepository(_context);
        _creditsRepository = new PostgresCreditsRepository(_context);
        _creditsService = new CreditsService(_creditsRepository);

        _catalogRepositoryMock = new Mock<ICatalogRepository>();
        _hubContextMock = new Mock<IHubContext<TrackingHub>>();
        _imageStorageServiceMock = new Mock<IImageStorageService>();

        _hubClientsMock = new Mock<IHubClients>();
        _clientProxyMock = new Mock<IClientProxy>();
        _hubContextMock.Setup(h => h.Clients).Returns(_hubClientsMock.Object);
        _hubClientsMock.Setup(c => c.Users(It.IsAny<IReadOnlyList<string>>())).Returns(_clientProxyMock.Object);

        _productService = new ProductService(
            _productRepository,
            _catalogRepositoryMock.Object,
            _hubContextMock.Object,
            _imageStorageServiceMock.Object,
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
        var products = await _productRepository.GetProductsBySellerAsync(sellerId);
        products.Should().BeEmpty();
    }
}
