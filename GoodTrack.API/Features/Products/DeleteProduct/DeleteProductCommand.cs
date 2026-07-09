using MediatR;
using GoodTrack.API.DTOs.Common;

namespace GoodTrack.API.Features.Products.DeleteProduct;

public sealed record DeleteProductCommand(
    string SellerId,
    string ProductId
) : IRequest<ApiResponse>;
