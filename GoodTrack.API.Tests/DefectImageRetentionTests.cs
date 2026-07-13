using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;
using GoodTrack.API.Constants;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Infrastructure.Repositories;
using GoodTrack.API.Models;

namespace GoodTrack.API.Tests;

/// <summary>
/// Arşivlenme damgası (<see cref="Product.ArchivedAt"/>) ve arşiv küçültme ("başkalaşım")
/// retention temizliği testleri: 30 gün sonra görseller + katalog referansı + müşteri PII'ı
/// temizlenir, satır minimum veriyle kalır.
/// </summary>
public class DefectImageRetentionTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;
    private readonly PostgresProductRepository _repository;

    public DefectImageRetentionTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        var httpContextAccessorMock = new Moq.Mock<Microsoft.AspNetCore.Http.IHttpContextAccessor>();
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

    private static Product NewProduct(string id, string status) => new()
    {
        Id = id,
        Code = "CODE-" + id,
        Status = status,
        SellerId = "seller-1",
        ManufacturerId = "mfr-1",
        CreatedAt = DateTime.UtcNow,
    };

    [Theory]
    [InlineData(OrderStatus.Shipped)]
    [InlineData(OrderStatus.Cancelled)]
    public async Task SaveChanges_StampsArchivedAt_WhenStatusBecomesTerminal(string terminalStatus)
    {
        var product = NewProduct("p1", OrderStatus.Production);
        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        // Üretimdeyken damga null olmalı.
        product.ArchivedAt.Should().BeNull();

        product.Status = terminalStatus;
        await _context.SaveChangesAsync();

        product.ArchivedAt.Should().NotBeNull();
        product.ArchivedAt!.Value.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task SaveChanges_DoesNotStampArchivedAt_ForNonTerminalStatus()
    {
        var product = NewProduct("p1", OrderStatus.Delivered);
        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        product.ArchivedAt.Should().BeNull();
    }

    [Fact]
    public async Task SaveChanges_DoesNotOverwriteExistingArchivedAt()
    {
        var original = DateTime.UtcNow.AddDays(-5);
        var product = NewProduct("p1", OrderStatus.Shipped);
        product.ArchivedAt = original;
        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        // Aynı terminal durumda tekrar kaydedince damga korunur.
        product.IsReadBySeller = false;
        await _context.SaveChangesAsync();

        product.ArchivedAt.Should().BeCloseTo(original, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task Slim_ClearsHeavyFieldsAndPii_OnlyForExpiredArchivedOrders()
    {
        static void FillHeavyFields(Product p)
        {
            p.Image = "data:image/jpeg;base64,IMG";
            p.ThumbnailImage = "data:image/jpeg;base64,THUMB";
            p.DefectImage = "data:image/jpeg;base64,DEFECT";
            p.CatalogProductId = "cat-1";
            p.CustomerName = "Müşteri Adı";
            p.ShippingAddress = "Adres";
        }

        // Arşivlenmiş + süre geçmiş → küçültülür
        var expired = NewProduct("expired", OrderStatus.Shipped);
        expired.ArchivedAt = DateTime.UtcNow.AddDays(-40);
        FillHeavyFields(expired);

        // Arşivlenmiş ama süre içinde → korunur
        var recent = NewProduct("recent", OrderStatus.Shipped);
        recent.ArchivedAt = DateTime.UtcNow.AddDays(-10);
        FillHeavyFields(recent);

        // Arşivlenmemiş (aktif) → korunur
        var active = NewProduct("active", OrderStatus.Delivered);
        FillHeavyFields(active);

        // Zaten küçültülmüş → tekrar dokunulmaz (idempotent)
        var alreadySlimmed = NewProduct("slimmed", OrderStatus.Shipped);
        alreadySlimmed.ArchivedAt = DateTime.UtcNow.AddDays(-60);
        alreadySlimmed.SlimmedAt = DateTime.UtcNow.AddDays(-30);

        _context.Products.AddRange(expired, recent, active, alreadySlimmed);
        await _context.SaveChangesAsync();

        var cutoff = DateTime.UtcNow.AddDays(-30);
        var affected = await _repository.SlimOrdersArchivedBeforeAsync(cutoff);

        affected.Should().Be(1);

        var fresh = await _context.Products.AsNoTracking().ToListAsync();

        var slim = fresh.Single(p => p.Id == "expired");
        slim.Image.Should().BeNull();
        slim.ThumbnailImage.Should().BeNull();
        slim.DefectImage.Should().BeNull();
        slim.CatalogProductId.Should().BeNull();
        slim.CustomerName.Should().BeNull();
        slim.ShippingAddress.Should().BeNull();
        slim.SlimmedAt.Should().NotBeNull();
        // Minimum veri korunur: satır silinmez, kimlik/durum alanları yerinde kalır.
        slim.Code.Should().Be("CODE-expired");
        slim.Status.Should().Be(OrderStatus.Shipped);

        var kept = fresh.Single(p => p.Id == "recent");
        kept.Image.Should().NotBeNull();
        kept.CustomerName.Should().Be("Müşteri Adı");
        kept.SlimmedAt.Should().BeNull();

        fresh.Single(p => p.Id == "active").Image.Should().NotBeNull();
    }

    [Fact]
    public async Task ArchivedPage_ReturnsOnlyArchived_NewestFirst_AndActiveListExcludesArchived()
    {
        var activeOrder = NewProduct("active", OrderStatus.Production);

        var oldArchived = NewProduct("old", OrderStatus.Shipped);
        oldArchived.ArchivedAt = DateTime.UtcNow.AddDays(-20);

        var newArchived = NewProduct("new", OrderStatus.Cancelled);
        newArchived.ArchivedAt = DateTime.UtcNow.AddDays(-1);

        var otherSeller = NewProduct("other", OrderStatus.Shipped);
        otherSeller.SellerId = "seller-2";
        otherSeller.ArchivedAt = DateTime.UtcNow.AddDays(-2);

        _context.Products.AddRange(activeOrder, oldArchived, newArchived, otherSeller);
        await _context.SaveChangesAsync();

        // Aktif liste arşivlenmişleri içermez.
        var activeList = await _repository.GetProductSummariesBySellerAsync("seller-1");
        activeList.Should().ContainSingle(p => p.Id == "active");

        // Arşiv sayfası: yalnız arşivlenmişler, yeniden eskiye, sayfalama çalışır.
        var (items, total) = await _repository.GetArchivedSummariesPageAsync("seller-1", asSeller: true, page: 1, pageSize: 1);
        total.Should().Be(2);
        items.Should().ContainSingle(p => p.Id == "new");

        var (page2, _) = await _repository.GetArchivedSummariesPageAsync("seller-1", asSeller: true, page: 2, pageSize: 1);
        page2.Should().ContainSingle(p => p.Id == "old");
    }
}
