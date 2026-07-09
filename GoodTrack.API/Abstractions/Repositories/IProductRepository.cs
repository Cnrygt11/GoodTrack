using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Repositories;

public interface IProductRepository
{
    Task<Product?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<List<Product>> GetProductsBySellerAsync(string sellerId, CancellationToken cancellationToken = default);
    Task<List<Product>> GetProductsByManufacturerAsync(string mfrId, CancellationToken cancellationToken = default);
    Task SaveAsync(Product product, CancellationToken cancellationToken = default);
    Task DeleteAsync(string id, CancellationToken cancellationToken = default);
    Task MarkProductsAsReadAsync(string userId, string role, string status, CancellationToken cancellationToken = default);
}
