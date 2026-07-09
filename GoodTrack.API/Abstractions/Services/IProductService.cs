using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using GoodTrack.API.DTOs.Product;

namespace GoodTrack.API.Abstractions.Services;

public interface IProductService
{
    Task<List<ProductResponseDto>> GetUserProductsAsync(string userId, string role, CancellationToken cancellationToken = default);
    Task<ProductResponseDto> CreateOrderAsync(string sellerId, string userName, CreateProductDto orderDto, CancellationToken cancellationToken = default);
    Task<ProductResponseDto> UpdateProductAsync(string sellerId, string orderId, UpdateProductDto updatedOrderDto, CancellationToken cancellationToken = default);
    Task DeleteProductAsync(string sellerId, string orderId, CancellationToken cancellationToken = default);
    Task<ProductResponseDto?> GetProductByIdAsync(string userId, string role, string orderId, CancellationToken cancellationToken = default);
    Task MarkStatusAsReadAsync(string userId, string role, string status);
}
