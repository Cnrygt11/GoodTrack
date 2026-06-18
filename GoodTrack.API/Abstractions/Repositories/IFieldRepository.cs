using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Repositories;

public interface IFieldRepository
{
    Task<ExtraFieldDef?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<List<ExtraFieldDef>> GetFieldsBySellerAsync(string sellerId, CancellationToken cancellationToken = default);
    Task SaveAsync(ExtraFieldDef field, CancellationToken cancellationToken = default);
    Task DeleteAsync(string id, CancellationToken cancellationToken = default);
}
