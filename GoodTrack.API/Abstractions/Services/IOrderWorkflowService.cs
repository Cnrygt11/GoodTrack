using System.Threading.Tasks;

namespace GoodTrack.API.Abstractions.Services;

public interface IOrderWorkflowService
{
    Task UpdateOrderStatusAsync(string userId, string role, string orderId, string newStatus, string? defectNote = null, string? defectImage = null);
    Task RequestOrderCancellationAsync(string sellerId, string orderId);
    Task RespondToOrderCancellationAsync(string mfrId, string orderId, bool approve);
}
