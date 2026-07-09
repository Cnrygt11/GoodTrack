using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.Features.Products.CreateOrder;

namespace GoodTrack.API.Tests;

public class CreateOrderCommandHandlerTests
{
    private readonly Mock<IProductService> _productServiceMock;
    private readonly Mock<ILogger<CreateOrderCommandHandler>> _loggerMock;
    private readonly CreateOrderCommandHandler _handler;

    public CreateOrderCommandHandlerTests()
    {
        _productServiceMock = new Mock<IProductService>();
        _loggerMock = new Mock<ILogger<CreateOrderCommandHandler>>();
        _handler = new CreateOrderCommandHandler(_productServiceMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task Handle_ValidRequest_ShouldCreateOrderAndReturnResponse()
    {
        // Arrange
        var dto = new CreateProductDto
        {
            Code = "ORDER-100",
            Image = "mock-image",
            Text = "mock-text",
            Length = "mock-length"
        };
        var command = new CreateOrderCommand("seller-1", "Seller One", dto);
        var productResponse = new ProductResponseDto
        {
            Id = "prod-1",
            Code = "ORDER-100",
            Status = "Awaiting"
        };

        _productServiceMock.Setup(s => s.CreateOrderAsync("seller-1", "Seller One", dto))
            .ReturnsAsync(productResponse);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Data.Should().BeEquivalentTo(productResponse);

        _productServiceMock.Verify(s => s.CreateOrderAsync("seller-1", "Seller One", dto), Times.Once);
    }
}
