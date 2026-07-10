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
    private readonly Mock<IImageStorageService> _imageStorageServiceMock;
    private readonly Mock<ICreditsService> _creditsServiceMock;
    private readonly OrderWorkflowService _workflowService;

    public OrderWorkflowServiceTests()
    {
        _productRepositoryMock = new Mock<IProductRepository>();
        _imageStorageServiceMock = new Mock<IImageStorageService>();
        _creditsServiceMock = new Mock<ICreditsService>();

        _workflowService = new OrderWorkflowService(
            _productRepositoryMock.Object,
            Mock.Of<INotificationService>(),
            _imageStorageServiceMock.Object,
            Mock.Of<IImageCleanupService>(),
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

    private Product SetupOrder(string orderId, string status, string sellerId = "seller-123", bool cancelRequested = false)
    {
        var product = new Product
        {
            Id = orderId,
            SellerId = sellerId,
            SellerName = "Test Seller",
            ManufacturerId = "mfr-456",
            ManufacturerName = "Test Mfr",
            Status = status,
            CancelRequested = cancelRequested
        };
        _productRepositoryMock
            .Setup(r => r.GetByIdAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(product);
        return product;
    }

    [Theory]
    [InlineData(OrderStatus.Awaiting)]
    [InlineData(OrderStatus.Corrected)]
    [InlineData(OrderStatus.Broken)]
    public async Task ApplyExternalCancellation_PreProduction_CancelsWithoutRefund(string status)
    {
        var product = SetupOrder("o1", status);

        var outcome = await _workflowService.ApplyExternalCancellationAsync("seller-123", "o1", "Etsy iptali");

        outcome.Should().Be(ExternalCancellationOutcome.Cancelled);
        product.Status.Should().Be(OrderStatus.Cancelled);
        product.IsReadByMfr.Should().BeFalse();
        product.Logs.Should().ContainSingle(l => l.Message == "Etsy iptali");
        // Dış kaynaklı iptalde kredi iade EDİLMEZ.
        _creditsServiceMock.Verify(c => c.RefundCreditAsync(It.IsAny<string>()), Times.Never);
        _productRepositoryMock.Verify(r => r.SaveAsync(product, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ApplyExternalCancellation_InProduction_SendsCancellationRequest()
    {
        var product = SetupOrder("o1", OrderStatus.Production);

        var outcome = await _workflowService.ApplyExternalCancellationAsync("seller-123", "o1", "Etsy iptali");

        outcome.Should().Be(ExternalCancellationOutcome.CancellationRequested);
        product.Status.Should().Be(OrderStatus.Production); // durum değişmez
        product.CancelRequested.Should().BeTrue();
        product.IsReadByMfr.Should().BeFalse(); // üreticiye bildirilir
        _creditsServiceMock.Verify(c => c.RefundCreditAsync(It.IsAny<string>()), Times.Never);
        _productRepositoryMock.Verify(r => r.SaveAsync(product, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ApplyExternalCancellation_InProductionAlreadyRequested_IsNoOp()
    {
        var product = SetupOrder("o1", OrderStatus.Production, cancelRequested: true);

        var outcome = await _workflowService.ApplyExternalCancellationAsync("seller-123", "o1", "Etsy iptali");

        outcome.Should().Be(ExternalCancellationOutcome.CancellationAlreadyRequested);
        _productRepositoryMock.Verify(r => r.SaveAsync(It.IsAny<Product>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ApplyExternalCancellation_AlreadyCancelled_IsNoOp()
    {
        SetupOrder("o1", OrderStatus.Cancelled);

        var outcome = await _workflowService.ApplyExternalCancellationAsync("seller-123", "o1", "Etsy iptali");

        outcome.Should().Be(ExternalCancellationOutcome.AlreadyCancelled);
        _productRepositoryMock.Verify(r => r.SaveAsync(It.IsAny<Product>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ApplyExternalCancellation_PostProduction_RequiresManualReviewWithoutStatusChange()
    {
        var product = SetupOrder("o1", OrderStatus.Shipped);

        var outcome = await _workflowService.ApplyExternalCancellationAsync("seller-123", "o1", "Etsy iptali");

        outcome.Should().Be(ExternalCancellationOutcome.RequiresManualReview);
        product.Status.Should().Be(OrderStatus.Shipped); // durum korunur
        product.Logs.Should().Contain(l => l.Message.Contains("manuel"));
        _creditsServiceMock.Verify(c => c.RefundCreditAsync(It.IsAny<string>()), Times.Never);
        _productRepositoryMock.Verify(r => r.SaveAsync(product, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ApplyExternalCancellation_WrongSeller_Throws()
    {
        SetupOrder("o1", OrderStatus.Awaiting, sellerId: "owner");

        var act = () => _workflowService.ApplyExternalCancellationAsync("intruder", "o1", "Etsy iptali");

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
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
