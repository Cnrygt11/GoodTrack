using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Services;

public interface IProductService
{
    Task<List<Product>> GetUserProductsAsync(string userId, string role);
    Task<Product> CreateOrderAsync(string sellerId, string sellerName, Product order);
    Task ToggleOrderCompletionAsync(string mfrId, string orderId, bool completed);
    Task<Product> UpdateProductAsync(string sellerId, string orderId, Product updatedOrder);
    Task DeleteProductAsync(string sellerId, string orderId);
    Task ToggleOrderDefectiveAsync(string sellerId, string orderId, bool isDefective, string? defectNote, string? defectImage);
    Task ToggleOrderApprovalAsync(string userId, string role, string orderId, bool isPendingApproval);
}

