using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.DTOs.Common;

namespace GoodTrack.API.Features.Products;

public sealed class GetProductsForUserQueryHandler : IRequestHandler<GetProductsForUserQuery, ApiResponse<List<ProductResponseDto>>>
{
    private readonly IProductService _productService;
    private readonly ILogger<GetProductsForUserQueryHandler> _logger;

    public GetProductsForUserQueryHandler(IProductService productService, ILogger<GetProductsForUserQueryHandler> logger)
    {
        _productService = productService;
        _logger = logger;
    }

    public async Task<ApiResponse<List<ProductResponseDto>>> Handle(GetProductsForUserQuery request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("CQRS: Retrieving products list for User: {UserId} with Role: {Role}", request.UserId, request.Role);
        var response = await _productService.GetUserProductsAsync(request.UserId, request.Role, cancellationToken);
        return new ApiResponse<List<ProductResponseDto>>(response);
    }
}
