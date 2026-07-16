using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
using GoodTrack.API.Constants;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Infrastructure.Repositories;
using GoodTrack.API.Models;

namespace GoodTrack.API.Tests;

/// <summary>
/// Sipariş liste özet projeksiyonunda kusur görseli testleri: liste yanıtı ağır DefectImage'ı
/// taşımaz, yalnız HasDefectImage bayrağını döner; tam görsel detay yolundan gelir.
/// </summary>
public class ProductSummaryDefectImageTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;
    private readonly PostgresProductRepository _repository;

    public ProductSummaryDefectImageTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        var httpContextAccessorMock = new Mock<Microsoft.AspNetCore.Http.IHttpContextAccessor>();
        _context = new AppDbContext(options, httpContextAccessorMock.Object);
        _context.Database.EnsureCreated();

        _repository = new PostgresProductRepository(_context);
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Close();
        _connection.Dispose();
    }

    private static Product NewProduct(string id, string sellerId, string? defectImage)
    {
        return new Product
        {
            Id = id,
            Code = "ORD-" + id,
            SellerId = sellerId,
            ManufacturerId = "mfr-1",
            SellerName = "Seller",
            ManufacturerName = "Mfr",
            Status = OrderStatus.Defective,
            DefectImage = defectImage,
            CreatedAt = DateTime.UtcNow
        };
    }

    [Fact]
    public async Task Summaries_DoNotCarryDefectImage_OnlyFlag()
    {
        var largeDefectImage = "data:image/png;base64," + new string('D', 500_000);
        _context.Products.Add(NewProduct("p1", "seller-1", largeDefectImage));
        _context.Products.Add(NewProduct("p2", "seller-1", defectImage: null));
        await _context.SaveChangesAsync();

        var summaries = await _repository.GetProductSummariesBySellerAsync("seller-1");

        summaries.Should().HaveCount(2);
        var withDefect = summaries.Find(s => s.Id == "p1")!;
        var withoutDefect = summaries.Find(s => s.Id == "p2")!;

        withDefect.DefectImage.Should().BeNull();
        withDefect.HasDefectImage.Should().BeTrue();
        withoutDefect.DefectImage.Should().BeNull();
        withoutDefect.HasDefectImage.Should().BeFalse();
    }

    [Fact]
    public async Task ArchivedSummaries_AlsoOmitDefectImage()
    {
        var product = NewProduct("p1", "seller-1", "data:image/png;base64,DEFECT");
        product.Status = OrderStatus.Shipped; // SaveChanges ArchivedAt damgalar.
        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        var (items, totalCount) = await _repository.GetArchivedSummariesPageAsync(
            "seller-1", asSeller: true, page: 1, pageSize: 10);

        totalCount.Should().Be(1);
        items[0].DefectImage.Should().BeNull();
        items[0].HasDefectImage.Should().BeTrue();
    }
}
