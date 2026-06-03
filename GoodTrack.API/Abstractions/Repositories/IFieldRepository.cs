using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Repositories;

public interface IFieldRepository
{
    Task<ExtraFieldDef?> GetByIdAsync(string id);
    Task<List<ExtraFieldDef>> GetFieldsBySellerAsync(string sellerId);
    Task SaveAsync(ExtraFieldDef field);
    Task DeleteAsync(string id);
}
