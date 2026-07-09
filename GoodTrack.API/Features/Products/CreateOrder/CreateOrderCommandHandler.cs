using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.DTOs.Common;

namespace GoodTrack.API.Features.Products.CreateOrder;

public sealed class CreateOrderCommandHandler : IRequestHandler<CreateOrderCommand, ApiResponse<ProductResponseDto>>
{
    private readonly IProductService _productService;
    private readonly ILogger<CreateOrderCommandHandler> _logger;

    public CreateOrderCommandHandler(IProductService productService, ILogger<CreateOrderCommandHandler> logger)
    {
        _productService = productService;
        _logger = logger;
    }

    public async Task<ApiResponse<ProductResponseDto>> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("CQRS: Creating order code {Code} for Seller: {SellerId}", request.Dto.Code, request.SellerId);

        var productResponse = await _productService.CreateOrderAsync(request.SellerId, request.SellerName, request.Dto, cancellationToken);
        return new ApiResponse<ProductResponseDto>(productResponse);
    }
}
