using System.Threading;
using System.Threading.Tasks;
using Moq;
using Xunit;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
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

        // Varsayılan: görsel hiçbir yerde kullanılmıyor.
        _productRepositoryMock
            .Setup(r => r.IsImageUsedBySellerAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _productRepositoryMock
            .Setup(r => r.IsDefectImageUsedBySellerAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _catalogRepositoryMock
            .Setup(r => r.IsImageUsedBySellerAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
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
    public async Task DeleteOrderImage_DataImage_DeletesImmediatelyWithoutRepositoryChecks()
    {
        const string url = "data:image/png;base64,abc";
        await _service.DeleteOrderImageIfUnusedAsync(url, "seller-1", "prod-1");

        VerifyDeleted(url, Times.Once());
        _productRepositoryMock.Verify(
            r => r.IsImageUsedBySellerAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _catalogRepositoryMock.Verify(
            r => r.IsImageUsedBySellerAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task DeleteOrderImage_UsedByAnotherProduct_DoesNotDelete()
    {
        const string url = "https://cdn/x.png";
        _productRepositoryMock
            .Setup(r => r.IsImageUsedBySellerAsync("seller-1", url, "prod-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        await _service.DeleteOrderImageIfUnusedAsync(url, "seller-1", "prod-1");
        VerifyDeleted(url, Times.Never());
    }

    [Fact]
    public async Task DeleteOrderImage_UsedInCatalog_DoesNotDelete()
    {
        const string url = "https://cdn/x.png";
        _catalogRepositoryMock
            .Setup(r => r.IsImageUsedBySellerAsync("seller-1", url, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        await _service.DeleteOrderImageIfUnusedAsync(url, "seller-1", "prod-1");
        VerifyDeleted(url, Times.Never());
    }

    [Fact]
    public async Task DeleteOrderImage_UnusedEverywhere_Deletes()
    {
        const string url = "https://cdn/x.png";
        await _service.DeleteOrderImageIfUnusedAsync(url, "seller-1", "prod-1");

        VerifyDeleted(url, Times.Once());
        // Mevcut sipariş, "başka sipariş kullanıyor mu" kontrolünden hariç tutulmalı.
        _productRepositoryMock.Verify(
            r => r.IsImageUsedBySellerAsync("seller-1", url, "prod-1", It.IsAny<CancellationToken>()),
            Times.Once);
    }

    // ─── DeleteDefectImageIfUnusedAsync ──────────────────────────────────────────

    [Fact]
    public async Task DeleteDefectImage_DataImage_DeletesImmediately()
    {
        const string url = "data:image/jpeg;base64,def";
        await _service.DeleteDefectImageIfUnusedAsync(url, "seller-1", "prod-1");
        VerifyDeleted(url, Times.Once());
    }

    [Fact]
    public async Task DeleteDefectImage_UsedAsDefectImageElsewhere_DoesNotDelete()
    {
        const string url = "https://cdn/defect.png";
        _productRepositoryMock
            .Setup(r => r.IsDefectImageUsedBySellerAsync("seller-1", url, "prod-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        await _service.DeleteDefectImageIfUnusedAsync(url, "seller-1", "prod-1");
        VerifyDeleted(url, Times.Never());
    }

    [Fact]
    public async Task DeleteDefectImage_UsedAsMainImageAnywhere_DoesNotDelete()
    {
        const string url = "https://cdn/defect.png";
        // Ana görsel kontrolü mevcut siparişi HARİÇ TUTMAZ (excludeProductId: null).
        _productRepositoryMock
            .Setup(r => r.IsImageUsedBySellerAsync("seller-1", url, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        await _service.DeleteDefectImageIfUnusedAsync(url, "seller-1", "prod-1");
        VerifyDeleted(url, Times.Never());
    }

    [Fact]
    public async Task DeleteDefectImage_UsedInCatalog_DoesNotDelete()
    {
        const string url = "https://cdn/defect.png";
        _catalogRepositoryMock
            .Setup(r => r.IsImageUsedBySellerAsync("seller-1", url, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

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
            .Setup(r => r.IsImageUsedBySellerAsync("seller-1", url, "cat-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        await _service.DeleteCatalogImageIfUnusedAsync(url, "seller-1", "cat-1");
        VerifyDeleted(url, Times.Never());
    }

    [Fact]
    public async Task DeleteCatalogImage_UsedByOrder_DoesNotDelete()
    {
        const string url = "https://cdn/cat.png";
        _productRepositoryMock
            .Setup(r => r.IsImageUsedBySellerAsync("seller-1", url, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

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
