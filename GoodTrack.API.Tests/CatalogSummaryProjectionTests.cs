using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Infrastructure.Repositories;
using GoodTrack.API.Models;

namespace GoodTrack.API.Tests;

/// <summary>
/// Katalog liste özet projeksiyonu testleri: liste yanıtı ağır tam görseli (Image) taşımaz,
/// yalnız ThumbnailImage döner; thumbnail'siz eski kayıtlarda tam görsele düşülür.
/// </summary>
public class CatalogSummaryProjectionTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;
    private readonly PostgresCatalogRepository _repository;

    public CatalogSummaryProjectionTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        var httpContextAccessorMock = new Mock<Microsoft.AspNetCore.Http.IHttpContextAccessor>();
        _context = new AppDbContext(options, httpContextAccessorMock.Object);
        _context.Database.EnsureCreated();

        _repository = new PostgresCatalogRepository(_context);
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Close();
        _connection.Dispose();
    }

    private static CatalogProduct NewProduct(string id, string sellerId, string image, string? thumbnail)
    {
        return new CatalogProduct
        {
            Id = id,
            SellerId = sellerId,
            ProductCode = "SKU-" + id,
            Image = image,
            ThumbnailImage = thumbnail,
            ManufacturerId = "mfr-1",
            ManufacturerName = "Mfr One",
            CreatedAt = DateTime.UtcNow.ToString("o")
        };
    }

    [Fact]
    public async Task Summaries_DoNotCarryFullImage_OnlyThumbnail()
    {
        var largeImage = "data:image/png;base64," + new string('A', 500_000);
        _context.CatalogProducts.Add(NewProduct("c1", "seller-1", largeImage, "data:image/png;base64,THUMB"));
        await _context.SaveChangesAsync();

        var summaries = await _repository.GetCatalogSummariesBySellerAsync("seller-1");

        summaries.Should().HaveCount(1);
        summaries[0].Image.Should().BeNull();
        summaries[0].ThumbnailImage.Should().Be("data:image/png;base64,THUMB");
    }

    [Fact]
    public async Task Summaries_LegacyRowWithoutThumbnail_FallsBackToFullImage()
    {
        _context.CatalogProducts.Add(NewProduct("c1", "seller-1", "data:image/png;base64,LEGACY", thumbnail: null));
        await _context.SaveChangesAsync();

        var summaries = await _repository.GetCatalogSummariesBySellerAsync("seller-1");

        summaries.Should().HaveCount(1);
        summaries[0].Image.Should().BeNull();
        summaries[0].ThumbnailImage.Should().Be("data:image/png;base64,LEGACY");
    }

    [Fact]
    public async Task Summaries_OnlyReturnRequestedSellersProducts()
    {
        _context.CatalogProducts.Add(NewProduct("c1", "seller-1", "img1", "t1"));
        _context.CatalogProducts.Add(NewProduct("c2", "seller-2", "img2", "t2"));
        await _context.SaveChangesAsync();

        var summaries = await _repository.GetCatalogSummariesBySellerAsync("seller-1");

        summaries.Select(s => s.Id).Should().BeEquivalentTo(new[] { "c1" });
    }
}
