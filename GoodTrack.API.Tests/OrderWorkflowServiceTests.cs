using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Moq;
using Xunit;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Constants;
using GoodTrack.API.Models;
using GoodTrack.API.Hubs;
using GoodTrack.API.Services;

namespace GoodTrack.API.Tests;

public class OrderWorkflowServiceTests
{
    private readonly Mock<IProductRepository> _productRepositoryMock;
    private readonly Mock<ICatalogRepository> _catalogRepositoryMock;
    private readonly Mock<IImageStorageService> _imageStorageServiceMock;
    private readonly Mock<ICreditsService> _creditsServiceMock;
    private readonly OrderWorkflowService _workflowService;

    public OrderWorkflowServiceTests()
    {
        _productRepositoryMock = new Mock<IProductRepository>();
        _catalogRepositoryMock = new Mock<ICatalogRepository>();
        var mediatorMock = new Mock<MediatR.IMediator>();
        _imageStorageServiceMock = new Mock<IImageStorageService>();
        _creditsServiceMock = new Mock<ICreditsService>();

        _workflowService = new OrderWorkflowService(
            _productRepositoryMock.Object,
            _catalogRepositoryMock.Object,
            mediatorMock.Object,
            _imageStorageServiceMock.Object,
            _creditsServiceMock.Object,
            Mock.Of<ILogger<OrderWorkflowService>>());
    }

    [Fact]
    public async Task UpdateOrderStatusAsync_SellerCancellingAwaitingOrder_ShouldSucceed()
    {
        // Arrange
        var orderId = "order-1";
        var userId = "seller-123";
        var product = new Product
        {
            Id = orderId,
            SellerId = userId,
            SellerName = "Test Seller",
            ManufacturerId = "mfr-456",
            ManufacturerName = "Test Mfr",
            Status = OrderStatus.Awaiting
        };

        _productRepositoryMock
            .Setup(r => r.GetByIdAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(product);

        // Act
        await _workflowService.UpdateOrderStatusAsync(userId, Roles.Seller, orderId, OrderStatus.Cancelled);

        // Assert
        product.Status.Should().Be(OrderStatus.Cancelled);
        product.IsReadBySeller.Should().BeTrue();
        product.IsReadByMfr.Should().BeFalse();
        product.Logs.Should().ContainSingle(l => l.Status == OrderStatus.Cancelled && l.Message == "Sipariş satıcı tarafından iptal edildi.");
        _productRepositoryMock.Verify(r => r.SaveAsync(product, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateOrderStatusAsync_SellerCancellingProductionOrder_ShouldThrowInvalidOperationException()
    {
        // Arrange
        var orderId = "order-2";
        var userId = "seller-123";
        var product = new Product
        {
            Id = orderId,
            SellerId = userId,
            ManufacturerId = "mfr-456",
            Status = OrderStatus.Production
        };

        _productRepositoryMock
            .Setup(r => r.GetByIdAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(product);

        // Act & Assert
        var act = () => _workflowService.UpdateOrderStatusAsync(userId, Roles.Seller, orderId, OrderStatus.Cancelled);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Üretime başlanmış olan siparişler iptal edilemez.");

        _productRepositoryMock.Verify(r => r.SaveAsync(It.IsAny<Product>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateOrderStatusAsync_MfrTakingAwaitingOrderToProduction_ShouldSucceed()
    {
        // Arrange
        var orderId = "order-3";
        var mfrId = "mfr-456";
        var product = new Product
        {
            Id = orderId,
            SellerId = "seller-123",
            ManufacturerId = mfrId,
            ManufacturerName = "Test Mfr",
            Status = OrderStatus.Awaiting
        };

        _productRepositoryMock
            .Setup(r => r.GetByIdAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(product);

        // Act
        await _workflowService.UpdateOrderStatusAsync(mfrId, Roles.Mfr, orderId, OrderStatus.Production);

        // Assert
        product.Status.Should().Be(OrderStatus.Production);
        product.IsReadByMfr.Should().BeTrue();
        product.IsReadBySeller.Should().BeFalse();
        product.IsReproduction.Should().BeFalse();
        product.Logs.Should().ContainSingle(l => l.Status == OrderStatus.Production && l.Message == "Sipariş üretici tarafından onaylandı ve üretime alındı.");
        _productRepositoryMock.Verify(r => r.SaveAsync(product, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateOrderStatusAsync_SellerTriggeringMfrTransition_ShouldThrowUnauthorizedAccessException()
    {
        // Arrange
        var orderId = "order-4";
        var userId = "seller-123";
        var product = new Product
        {
            Id = orderId,
            SellerId = userId,
            ManufacturerId = "mfr-456",
            Status = OrderStatus.Production
        };

        _productRepositoryMock
            .Setup(r => r.GetByIdAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(product);

        // Act & Assert
        var act = () => _workflowService.UpdateOrderStatusAsync(userId, Roles.Seller, orderId, OrderStatus.Completed);
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Bu işlemi sadece üretici gerçekleştirebilir.");

        _productRepositoryMock.Verify(r => r.SaveAsync(It.IsAny<Product>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
