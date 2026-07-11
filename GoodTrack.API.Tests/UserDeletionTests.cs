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
/// Bir kullanıcı fiziksel silindiğinde (admin) ilişkili tüm verinin temizlendiğini,
/// ilgisiz verinin korunduğunu doğrular. FK cascade'i olmayan Product/CatalogProduct/
/// UserConnection uygulama seviyesinde; EtsyConnection ise DB FK cascade ile silinir.
/// </summary>
public class UserDeletionTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;
    private readonly PostgresUserRepository _repository;

    public UserDeletionTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;
        _context = new AppDbContext(options, Mock.Of<Microsoft.AspNetCore.Http.IHttpContextAccessor>());
        _context.Database.EnsureCreated();
        _repository = new PostgresUserRepository(_context);
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    private void Seed()
    {
        _context.Users.Add(new User { Id = "u1", Username = "seller1", Email = "u1@x.com", Role = "seller" });
        _context.Users.Add(new User { Id = "m1", Username = "mfr1", Email = "m1@x.com", Role = "mfr" });
        _context.Users.Add(new User { Id = "other", Username = "other", Email = "other@x.com", Role = "seller" });

        // u1'in satıcı olduğu sipariş
        _context.Products.Add(new Product { Id = "p-seller", Code = "A", SellerId = "u1", ManufacturerId = "m1", Status = "awaiting", CreatedAt = DateTime.UtcNow });
        // u1'in üretici olduğu sipariş
        _context.Products.Add(new Product { Id = "p-mfr", Code = "B", SellerId = "other", ManufacturerId = "u1", Status = "awaiting", CreatedAt = DateTime.UtcNow });
        // u1 ile ilgisiz sipariş — KORUNMALI
        _context.Products.Add(new Product { Id = "p-other", Code = "C", SellerId = "other", ManufacturerId = "m1", Status = "awaiting", CreatedAt = DateTime.UtcNow });

        _context.CatalogProducts.Add(new CatalogProduct { Id = "cat-u1", SellerId = "u1", ManufacturerId = "m1", ProductCode = "SKU", CreatedAt = DateTime.UtcNow.ToString("o") });
        _context.CatalogProducts.Add(new CatalogProduct { Id = "cat-other", SellerId = "other", ManufacturerId = "m1", ProductCode = "SKU2", CreatedAt = DateTime.UtcNow.ToString("o") });

        _context.UserConnections.Add(new UserConnection { Id = "uc-u1", SellerId = "u1", ManufacturerId = "m1", ConnectedAt = DateTime.UtcNow });
        _context.UserConnections.Add(new UserConnection { Id = "uc-other", SellerId = "other", ManufacturerId = "m1", ConnectedAt = DateTime.UtcNow });

        _context.EtsyConnections.Add(new EtsyConnection
        {
            UserId = "u1", EtsyShopId = "shop-1", EtsyShopName = "Shop", ApiKeyKeystring = "k",
            ApiKeySharedSecret = "s", AccessToken = "a", RefreshToken = "r",
            TokenExpiresAt = DateTime.UtcNow.AddHours(1), IsActive = true
        });

        _context.SaveChanges();
    }

    [Fact]
    public async Task DeleteUser_RemovesAllRelatedData_KeepsUnrelated()
    {
        Seed();

        await _repository.DeleteUserAsync("u1");

        // İlişkili veriler silindi (u1 satıcı VEYA üretici)
        _context.Products.Select(p => p.Id).Should().BeEquivalentTo(new[] { "p-other" });
        _context.CatalogProducts.Select(c => c.Id).Should().BeEquivalentTo(new[] { "cat-other" });
        _context.UserConnections.Select(uc => uc.Id).Should().BeEquivalentTo(new[] { "uc-other" });

        // FK cascade ile Etsy bağlantısı da gitti
        _context.EtsyConnections.Any(c => c.UserId == "u1").Should().BeFalse();

        // Kullanıcının kendisi silindi; diğerleri duruyor
        _context.Users.Select(u => u.Id).Should().BeEquivalentTo(new[] { "m1", "other" });
    }

    [Fact]
    public async Task DeleteUser_NonExistent_IsNoOp()
    {
        Seed();

        await _repository.DeleteUserAsync("ghost");

        _context.Products.Should().HaveCount(3);
        _context.Users.Should().HaveCount(3);
    }
}
