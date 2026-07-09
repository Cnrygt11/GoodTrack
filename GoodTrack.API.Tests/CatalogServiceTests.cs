using System;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Xunit;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.Models;
using GoodTrack.API.Services;

namespace GoodTrack.API.Tests;

public class CatalogServiceTests
{
    private readonly Mock<ICatalogRepository> _catalogRepositoryMock = new();
    private readonly Mock<IImageStorageService> _imageStorageServiceMock = new();
    private readonly Mock<IImageCleanupService> _imageCleanupServiceMock = new();
    private readonly CatalogService _service;

    public CatalogServiceTests()
    {
        _service = new CatalogService(
            _catalogRepositoryMock.Object,
            _imageStorageServiceMock.Object,
            _imageCleanupServiceMock.Object);

        _imageStorageServiceMock
            .Setup(s => s.StoreImageAsync(It.IsAny<string?>()))
            .ReturnsAsync((string? v) => v);
    }

    private static CreateCatalogProductDto ValidDto() => new()
    {
        ProductCode = "SKU-1",
        ManufacturerId = "mfr-1",
        ManufacturerName = "Mfr One",
        Text = "Ürün",
    };

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task AddCatalogProduct_EmptyProductCode_Throws(string code)
    {
        var dto = ValidDto();
        dto.ProductCode = code;

        var act = () => _service.AddCatalogProductAsync("seller-1", dto);
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task AddCatalogProduct_MissingManufacturer_Throws()
    {
        var dto = ValidDto();
        dto.ManufacturerId = "";

        var act = () => _service.AddCatalogProductAsync("seller-1", dto);
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task AddCatalogProduct_DuplicateCode_Throws()
    {
        _catalogRepositoryMock
            .Setup(r => r.HasProductCodeAsync("seller-1", "SKU-1"))
            .ReturnsAsync(true);

        var act = () => _service.AddCatalogProductAsync("seller-1", ValidDto());
        await act.Should().ThrowAsync<ArgumentException>();

        _catalogRepositoryMock.Verify(r => r.SaveAsync(It.IsAny<CatalogProduct>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task AddCatalogProduct_Valid_SavesTrimmedProduct()
    {
        _catalogRepositoryMock
            .Setup(r => r.HasProductCodeAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(false);

        CatalogProduct? saved = null;
        _catalogRepositoryMock
            .Setup(r => r.SaveAsync(It.IsAny<CatalogProduct>(), It.IsAny<CancellationToken>()))
            .Callback<CatalogProduct, CancellationToken>((p, _) => saved = p)
            .Returns(Task.CompletedTask);

        var dto = ValidDto();
        dto.ProductCode = "  SKU-1  ";

        var result = await _service.AddCatalogProductAsync("seller-1", dto);

        saved.Should().NotBeNull();
        saved!.ProductCode.Should().Be("SKU-1");
        saved.SellerId.Should().Be("seller-1");
        result.ProductCode.Should().Be("SKU-1");
    }

    [Fact]
    public async Task UpdateCatalogProduct_NotFound_ThrowsKeyNotFound()
    {
        _catalogRepositoryMock
            .Setup(r => r.GetByIdAsync("missing", It.IsAny<CancellationToken>()))
            .ReturnsAsync((CatalogProduct?)null);

        var act = () => _service.UpdateCatalogProductAsync("seller-1", "missing", ValidDto());
        await act.Should().ThrowAsync<System.Collections.Generic.KeyNotFoundException>();
    }

    [Fact]
    public async Task DeleteCatalogProduct_NotOwner_ThrowsUnauthorized()
    {
        _catalogRepositoryMock
            .Setup(r => r.GetByIdAsync("cat-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CatalogProduct { Id = "cat-1", SellerId = "someone-else" });

        var act = () => _service.DeleteCatalogProductAsync("seller-1", "cat-1");
        await act.Should().ThrowAsync<UnauthorizedAccessException>();

        _catalogRepositoryMock.Verify(r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeleteCatalogProduct_Owner_DeletesAndCleansImage()
    {
        _catalogRepositoryMock
            .Setup(r => r.GetByIdAsync("cat-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CatalogProduct { Id = "cat-1", SellerId = "seller-1", Image = "https://cdn/x.png" });

        await _service.DeleteCatalogProductAsync("seller-1", "cat-1");

        _imageCleanupServiceMock.Verify(s => s.DeleteCatalogImageIfUnusedAsync("https://cdn/x.png", "seller-1", "cat-1"), Times.Once);
        _catalogRepositoryMock.Verify(r => r.DeleteAsync("cat-1", It.IsAny<CancellationToken>()), Times.Once);
    }
}
