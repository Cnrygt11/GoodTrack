using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Repositories;

public interface ICatalogRepository
{
    Task<CatalogProduct?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<List<CatalogProduct>> GetCatalogBySellerAsync(string sellerId, CancellationToken cancellationToken = default);
    Task<bool> HasProductCodeAsync(string sellerId, string code);
    Task SaveAsync(CatalogProduct product, CancellationToken cancellationToken = default);
    Task DeleteAsync(string id, CancellationToken cancellationToken = default);
}
