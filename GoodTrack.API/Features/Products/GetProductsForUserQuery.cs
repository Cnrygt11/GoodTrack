using MediatR;
using System.Collections.Generic;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.DTOs.Common;

namespace GoodTrack.API.Features.Products;

public sealed record GetProductsForUserQuery(string UserId, string Role) : IRequest<ApiResponse<List<ProductResponseDto>>>;
