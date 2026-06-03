using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Services;

public interface ICatalogService
{
    Task<List<CatalogProduct>> GetSellerCatalogAsync(string sellerId);
    Task<CatalogProduct> AddCatalogProductAsync(string sellerId, CatalogProduct product);
    Task<CatalogProduct> UpdateCatalogProductAsync(string sellerId, string id, CatalogProduct updatedProduct);
    Task DeleteCatalogProductAsync(string sellerId, string id);

}
