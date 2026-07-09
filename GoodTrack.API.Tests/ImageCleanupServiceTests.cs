using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Moq;
using Xunit;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Models;
using GoodTrack.API.Services;

namespace GoodTrack.API.Tests;

public class ImageCleanupServiceTests
{
    private readonly Mock<IProductRepository> _productRepositoryMock = new();
    private readonly Mock<ICatalogRepository> _catalogRepositoryMock = new();
    private readonly Mock<IImageStorageService> _imageStorageServiceMock = new();
    private readonly ImageCleanupService _service;

    public ImageCleanupServiceTests()
    {
        _service = new ImageCleanupService(
            _productRepositoryMock.Object,
            _catalogRepositoryMock.Object,
            _imageStorageServiceMock.Object);

        _productRepositoryMock
            .Setup(r => r.GetProductsBySellerAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Product>());
        _catalogRepositoryMock
            .Setup(r => r.GetCatalogBySellerAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<CatalogProduct>());
    }

    private void VerifyDeleted(string url, Times times) =>
        _imageStorageServiceMock.Verify(s => s.DeleteImageAsync(url), times);

    // ─── DeleteOrderImageIfUnusedAsync ───────────────────────────────────────────

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task DeleteOrderImage_EmptyUrl_DoesNothing(string? url)
    {
        await _service.DeleteOrderImageIfUnusedAsync(url, "seller-1", "prod-1");
        _imageStorageServiceMock.Verify(s => s.DeleteImageAsync(It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task DeleteOrderImage_DataImage_DeletesImmediately()
    {
        const string url = "data:image/png;base64,abc";
        await _service.DeleteOrderImageIfUnusedAsync(url, "seller-1", "prod-1");
        VerifyDeleted(url, Times.Once());
    }

    [Fact]
    public async Task DeleteOrderImage_UsedByAnotherProduct_DoesNotDelete()
    {
        const string url = "https://cdn/x.png";
        _productRepositoryMock
            .Setup(r => r.GetProductsBySellerAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Product> { new() { Id = "other", Image = url } });

        await _service.DeleteOrderImageIfUnusedAsync(url, "seller-1", "prod-1");
        VerifyDeleted(url, Times.Never());
    }

    [Fact]
    public async Task DeleteOrderImage_UsedInCatalog_DoesNotDelete()
    {
        const string url = "https://cdn/x.png";
        _catalogRepositoryMock
            .Setup(r => r.GetCatalogBySellerAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<CatalogProduct> { new() { Id = "c1", Image = url } });

        await _service.DeleteOrderImageIfUnusedAsync(url, "seller-1", "prod-1");
        VerifyDeleted(url, Times.Never());
    }

    [Fact]
    public async Task DeleteOrderImage_UnusedEverywhere_Deletes()
    {
        const string url = "https://cdn/x.png";
        await _service.DeleteOrderImageIfUnusedAsync(url, "seller-1", "prod-1");
        VerifyDeleted(url, Times.Once());
    }

    // ─── DeleteDefectImageIfUnusedAsync ──────────────────────────────────────────

    [Fact]
    public async Task DeleteDefectImage_UsedAsMainImageElsewhere_DoesNotDelete()
    {
        const string url = "https://cdn/defect.png";
        _productRepositoryMock
            .Setup(r => r.GetProductsBySellerAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Product> { new() { Id = "other", Image = url } });

        await _service.DeleteDefectImageIfUnusedAsync(url, "seller-1", "prod-1");
        VerifyDeleted(url, Times.Never());
    }

    [Fact]
    public async Task DeleteDefectImage_Unused_Deletes()
    {
        const string url = "https://cdn/defect.png";
        await _service.DeleteDefectImageIfUnusedAsync(url, "seller-1", "prod-1");
        VerifyDeleted(url, Times.Once());
    }

    // ─── DeleteCatalogImageIfUnusedAsync ─────────────────────────────────────────

    [Fact]
    public async Task DeleteCatalogImage_UsedByAnotherCatalogProduct_DoesNotDelete()
    {
        const string url = "https://cdn/cat.png";
        _catalogRepositoryMock
            .Setup(r => r.GetCatalogBySellerAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<CatalogProduct> { new() { Id = "other", Image = url } });

        await _service.DeleteCatalogImageIfUnusedAsync(url, "seller-1", "cat-1");
        VerifyDeleted(url, Times.Never());
    }

    [Fact]
    public async Task DeleteCatalogImage_UsedByOrder_DoesNotDelete()
    {
        const string url = "https://cdn/cat.png";
        _productRepositoryMock
            .Setup(r => r.GetProductsBySellerAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Product> { new() { Id = "o1", Image = url } });

        await _service.DeleteCatalogImageIfUnusedAsync(url, "seller-1", "cat-1");
        VerifyDeleted(url, Times.Never());
    }

    [Fact]
    public async Task DeleteCatalogImage_Unused_Deletes()
    {
        const string url = "https://cdn/cat.png";
        await _service.DeleteCatalogImageIfUnusedAsync(url, "seller-1", "cat-1");
        VerifyDeleted(url, Times.Once());
    }
}
