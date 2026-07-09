using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Common;

namespace GoodTrack.API.Features.Products.UpdateOrderStatus;

public sealed class UpdateOrderStatusCommandHandler : IRequestHandler<UpdateOrderStatusCommand, ApiResponse<object>>
{
    private readonly IOrderWorkflowService _orderWorkflowService;
    private readonly ILogger<UpdateOrderStatusCommandHandler> _logger;

    public UpdateOrderStatusCommandHandler(IOrderWorkflowService orderWorkflowService, ILogger<UpdateOrderStatusCommandHandler> logger)
    {
        _orderWorkflowService = orderWorkflowService;
        _logger = logger;
    }

    public async Task<ApiResponse<object>> Handle(UpdateOrderStatusCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("CQRS: Updating status of order {Id} to {Status} by User {UserId}", request.OrderId, request.Status, request.UserId);
        
        await _orderWorkflowService.UpdateOrderStatusAsync(
            request.UserId,
            request.Role,
            request.OrderId,
            request.Status,
            request.DefectNote,
            request.DefectImage
        );

        return new ApiResponse<object>(new { id = request.OrderId, status = request.Status }, "Sipariş durumu başarıyla güncellendi.");
    }
}
