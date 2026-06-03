using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Repositories;

public interface ICatalogRepository
{
    Task<CatalogProduct?> GetByIdAsync(string id);
    Task<List<CatalogProduct>> GetCatalogBySellerAsync(string sellerId);
    Task<bool> HasProductCodeAsync(string sellerId, string code);
    Task SaveAsync(CatalogProduct product);
    Task DeleteAsync(string id);
}
