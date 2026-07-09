using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Common;

namespace GoodTrack.API.Features.Products.DeleteProduct;

public sealed class DeleteProductCommandHandler : IRequestHandler<DeleteProductCommand, ApiResponse>
{
    private readonly IProductService _productService;
    private readonly ILogger<DeleteProductCommandHandler> _logger;

    public async Task<ApiResponse> Handle(DeleteProductCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("CQRS: Deleting product {Id} for Seller {SellerId}", request.ProductId, request.SellerId);

        await _productService.DeleteProductAsync(request.SellerId, request.ProductId, cancellationToken);
        return ApiResponse.Ok("Sipariş başarıyla silindi.");
    }

    public DeleteProductCommandHandler(IProductService productService, ILogger<DeleteProductCommandHandler> logger)
    {
        _productService = productService;
        _logger = logger;
    }
}
