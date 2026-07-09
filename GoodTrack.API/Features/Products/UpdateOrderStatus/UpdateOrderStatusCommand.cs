using MediatR;
using GoodTrack.API.DTOs.Common;

namespace GoodTrack.API.Features.Products.UpdateOrderStatus;

public sealed record UpdateOrderStatusCommand(
    string UserId,
    string Role,
    string OrderId,
    string Status,
    string? DefectNote,
    string? DefectImage
) : IRequest<ApiResponse<object>>;
