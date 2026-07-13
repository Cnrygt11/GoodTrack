using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Constants;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Infrastructure.Repositories;
using GoodTrack.API.Models;
using GoodTrack.API.Services;

namespace GoodTrack.API.Tests;

/// <summary>
/// Üretici dizini optimizasyonları: arama projeksiyonu galeriyi hariç tutar + sayı döner (Bulgu 2),
/// talep üzerine galeri uç noktası yetkilendirmesi (Bulgu 2), özet projeksiyonu (Bulgu 4) ve
/// şehir filtresi büyük/küçük harf duyarsızlığı (Bulgu 5).
/// </summary>
public class DirectoryOptimizationTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;
    private readonly PostgresUserRepository _repository;
    private readonly ProfileService _profileService;

    public DirectoryOptimizationTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        var httpContextAccessorMock = new Mock<Microsoft.AspNetCore.Http.IHttpContextAccessor>();
        _context = new AppDbContext(options, httpContextAccessorMock.Object);
        _context.Database.EnsureCreated();

        _repository = new PostgresUserRepository(_context);
        _profileService = new ProfileService(
            _repository,
            Mock.Of<IImageStorageService>(),
            Mock.Of<IEtsyConnectionRepository>(),
            Mock.Of<IPasswordHasher<User>>(),
            Mock.Of<ILogger<ProfileService>>());
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Close();
        _connection.Dispose();
    }

    private User NewMfr(string id, string username, bool visible = true)
    {
        return new User
        {
            Id = id,
            Username = username,
            Email = username + "@test.com",
            PasswordHash = "x",
            Role = Roles.Mfr,
            City = "Bursa",
            IsVisibleToSellers = visible,
            ProfilePicture = "avatar-" + id,
            ProductImages = new List<string> { "img1", "img2", "img3" },
        };
    }

    [Fact]
    public async Task Search_ExcludesGalleryButKeepsCountAndAvatar()
    {
        _context.Users.Add(NewMfr("m1", "mfr_one"));
        await _context.SaveChangesAsync();

        var (items, total) = await _repository.SearchManufacturersAsync(null, null, null, null, 0, 10);

        var item = items.Single();
        item.Id.Should().Be("m1");
        // Avatar listede thumbnail alanından gelir (thumbnail yoksa tam avatara düşer).
        item.ProfileThumbnail.Should().Be("avatar-m1");
        item.ProductImages.Should().BeEmpty();          // galeri listede taşınmaz
        item.GalleryCount.Should().Be(3);               // yalnız sayı gelir
        total.Should().Be(1);
    }

    [Fact]
    public async Task Search_CityFilter_IsCaseInsensitive()
    {
        _context.Users.Add(NewMfr("m1", "mfr_one")); // City = "Bursa"
        await _context.SaveChangesAsync();

        var (items, _) = await _repository.SearchManufacturersAsync("bursa", null, null, null, 0, 10);

        items.Should().ContainSingle(i => i.Id == "m1");
    }

    [Fact]
    public async Task Search_NameFilter_MatchesPartialCaseInsensitive()
    {
        var mfr = NewMfr("m1", "acme_mfr");
        mfr.FirstName = "Ahmet";
        mfr.LastName = "Yılmaz";
        _context.Users.Add(mfr);
        _context.Users.Add(NewMfr("m2", "other_mfr"));
        await _context.SaveChangesAsync();

        // İsim parçası (kasa-duyarsız)
        var (byName, _) = await _repository.SearchManufacturersAsync(null, null, "ahm", null, 0, 10);
        byName.Should().ContainSingle(i => i.Id == "m1");

        // Kullanıcı adı parçası
        var (byUsername, _) = await _repository.SearchManufacturersAsync(null, null, "acme", null, 0, 10);
        byUsername.Should().ContainSingle(i => i.Id == "m1");
    }

    [Fact]
    public async Task Search_Offset_ReturnsCorrectPageAndTotal()
    {
        for (var i = 0; i < 5; i++)
        {
            _context.Users.Add(NewMfr($"m{i}", $"mfr_{i}"));
        }
        await _context.SaveChangesAsync();

        var (page0, total) = await _repository.SearchManufacturersAsync(null, null, null, "name", 0, 2);
        var (page1, _) = await _repository.SearchManufacturersAsync(null, null, null, "name", 1, 2);

        total.Should().Be(5);
        page0.Should().HaveCount(2);
        page1.Should().HaveCount(2);
        page0.Select(i => i.Id).Should().NotIntersectWith(page1.Select(i => i.Id));
    }

    [Fact]
    public async Task GetManufacturerGallery_ReturnsImages_ForVisibleManufacturer()
    {
        _context.Users.Add(NewMfr("m1", "mfr_one"));
        await _context.SaveChangesAsync();

        var gallery = await _profileService.GetManufacturerGalleryAsync("m1");

        gallery.Should().BeEquivalentTo(new[] { "img1", "img2", "img3" });
    }

    [Fact]
    public async Task GetManufacturerGallery_Throws_ForHiddenManufacturer()
    {
        _context.Users.Add(NewMfr("hidden", "hidden_mfr", visible: false));
        await _context.SaveChangesAsync();

        await FluentActions
            .Awaiting(() => _profileService.GetManufacturerGalleryAsync("hidden"))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task GetManufacturerSummaries_ReturnsOnlyVisibleWithMinimalFields()
    {
        _context.Users.Add(NewMfr("m1", "visible_mfr"));
        _context.Users.Add(NewMfr("m2", "hidden_mfr", visible: false));
        await _context.SaveChangesAsync();

        var summaries = await _repository.GetManufacturerSummariesAsync();

        summaries.Should().ContainSingle();
        var only = summaries.Single();
        only.Id.Should().Be("m1");
        only.Username.Should().Be("visible_mfr");
        only.Role.Should().Be(Roles.Mfr);
    }
}
