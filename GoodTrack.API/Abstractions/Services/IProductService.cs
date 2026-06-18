using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Services;

public interface IProductService
{
    Task<List<Product>> GetUserProductsAsync(string userId, string role, CancellationToken cancellationToken = default);
    Task<Product> CreateOrderAsync(string sellerId, string sellerName, Product order);
    Task<Product> UpdateProductAsync(string sellerId, string orderId, Product updatedOrder);
    Task DeleteProductAsync(string sellerId, string orderId);
    Task UpdateOrderStatusAsync(string userId, string role, string orderId, string newStatus, string? defectNote = null, string? defectImage = null);
    Task<Product?> GetProductByIdAsync(string userId, string role, string orderId, CancellationToken cancellationToken = default);
    Task<int> MigrateProductStatusesAsync();
    Task RequestOrderCancellationAsync(string sellerId, string orderId);
    Task RespondToOrderCancellationAsync(string mfrId, string orderId, bool approve);
}

