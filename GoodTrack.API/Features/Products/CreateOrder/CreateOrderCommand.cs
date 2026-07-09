using MediatR;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.DTOs.Common;

namespace GoodTrack.API.Features.Products.CreateOrder;

public sealed record CreateOrderCommand(
    string SellerId,
    string SellerName,
    CreateProductDto Dto
) : IRequest<ApiResponse<ProductResponseDto>>;
