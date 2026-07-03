using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using GoodTrack.API.DTOs.Product;

namespace GoodTrack.API.Abstractions.Services;

public interface IProductService
{
    Task<List<ProductResponseDto>> GetUserProductsAsync(string userId, string role, CancellationToken cancellationToken = default);
    Task<ProductResponseDto> CreateOrderAsync(string sellerId, string userName, CreateProductDto orderDto);
    Task<ProductResponseDto> UpdateProductAsync(string sellerId, string orderId, UpdateProductDto updatedOrderDto);
    Task DeleteProductAsync(string sellerId, string orderId);
    Task<ProductResponseDto?> GetProductByIdAsync(string userId, string role, string orderId, CancellationToken cancellationToken = default);
    Task<int> MigrateProductStatusesAsync();
    Task MarkStatusAsReadAsync(string userId, string role, string status);
}
