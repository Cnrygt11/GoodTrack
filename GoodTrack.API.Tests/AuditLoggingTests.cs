using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;
using GoodTrack.API.Constants;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Models;
using GoodTrack.API.Services;

namespace GoodTrack.API.Tests;

/// <summary>
/// Audit log'un ağır base64 alanları hariç tutması (Bulgu 1) ve retention temizliği (Bulgu 3) testleri.
/// </summary>
public class AuditLoggingTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;

    public AuditLoggingTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        var httpContextAccessorMock = new Moq.Mock<Microsoft.AspNetCore.Http.IHttpContextAccessor>();
        _context = new AppDbContext(options, httpContextAccessorMock.Object);
        _context.Database.EnsureCreated();
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

    [Fact]
    public async Task Audit_OmitsBase64Image_OnInsert()
    {
        var product = NewProduct("p1", OrderStatus.Production);
        product.Image = "data:image/png;base64,SECRETBIGIMAGEDATA";
        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        var audit = await _context.AuditLogs.AsNoTracking().FirstAsync(a => a.Action == "Added");

        audit.NewValues.Should().NotContain("SECRETBIGIMAGEDATA");
        audit.NewValues.Should().Contain("[omitted]");
        // Normal (küçük) alanlar aynen kaydedilmeye devam eder.
        audit.NewValues.Should().Contain("CODE-p1");
    }

    [Fact]
    public async Task Audit_OmitsBase64DefectImage_OnUpdate()
    {
        var product = NewProduct("p1", OrderStatus.Delivered);
        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        product.Status = OrderStatus.Defective;
        product.DefectImage = "data:image/png;base64,DEFECTSECRETDATA";
        await _context.SaveChangesAsync();

        var audit = await _context.AuditLogs.AsNoTracking()
            .Where(a => a.Action == "Modified")
            .OrderByDescending(a => a.Timestamp)
            .FirstAsync();

        audit.NewValues.Should().NotContain("DEFECTSECRETDATA");
        audit.NewValues.Should().Contain("[omitted]");
    }

    [Fact]
    public async Task AuditRetention_DeletesOnlyEntriesOlderThanCutoff()
    {
        _context.AuditLogs.AddRange(
            new AuditLog { Id = "old", EntityName = "products", Action = "Added", KeyValues = "{}", Timestamp = DateTime.UtcNow.AddMonths(-4) },
            new AuditLog { Id = "recent", EntityName = "products", Action = "Added", KeyValues = "{}", Timestamp = DateTime.UtcNow.AddDays(-10) });
        await _context.SaveChangesAsync();

        var cutoff = DateTime.UtcNow.AddMonths(-3);
        var affected = await AuditLogRetentionService.PurgeAsync(_context, cutoff);

        affected.Should().Be(1);
        var remaining = await _context.AuditLogs.AsNoTracking().Select(a => a.Id).ToListAsync();
        remaining.Should().ContainSingle().Which.Should().Be("recent");
    }
}
