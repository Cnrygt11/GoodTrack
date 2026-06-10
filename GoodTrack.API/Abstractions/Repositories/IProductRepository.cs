using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Repositories;

public interface IProductRepository
{
    Task<Product?> GetByIdAsync(string id);
    Task<List<Product>> GetProductsBySellerAsync(string sellerId);
    Task<List<Product>> GetProductsByManufacturerAsync(string mfrId);
    Task SaveAsync(Product product);
    Task DeleteAsync(string id);
    Task<int> MigrateStatusesAsync();
}
