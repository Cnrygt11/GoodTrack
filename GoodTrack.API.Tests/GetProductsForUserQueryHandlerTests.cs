using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.Features.Products;

namespace GoodTrack.API.Tests;

public class GetProductsForUserQueryHandlerTests
{
    private readonly Mock<IProductService> _productServiceMock;
    private readonly Mock<ILogger<GetProductsForUserQueryHandler>> _loggerMock;
    private readonly GetProductsForUserQueryHandler _handler;

    public GetProductsForUserQueryHandlerTests()
    {
        _productServiceMock = new Mock<IProductService>();
        _loggerMock = new Mock<ILogger<GetProductsForUserQueryHandler>>();
        _handler = new GetProductsForUserQueryHandler(_productServiceMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task Handle_ValidRequest_ShouldReturnProducts()
    {
        // Arrange
        var query = new GetProductsForUserQuery("user-1", "Seller");
        var productsList = new List<ProductResponseDto>
        {
            new() { Id = "prod-1", Code = "CODE-1", Status = "Awaiting" }
        };

        _productServiceMock.Setup(s => s.GetUserProductsAsync("user-1", "Seller", It.IsAny<CancellationToken>()))
            .ReturnsAsync(productsList);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Data.Should().BeEquivalentTo(productsList);

        _productServiceMock.Verify(s => s.GetUserProductsAsync("user-1", "Seller", It.IsAny<CancellationToken>()), Times.Once);
    }
}
