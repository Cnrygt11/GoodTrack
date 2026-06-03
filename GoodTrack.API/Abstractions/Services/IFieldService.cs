using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Services;

public interface IFieldService
{
    Task<List<ExtraFieldDef>> GetSellerFieldsAsync(string sellerId);
    Task<ExtraFieldDef> CreateFieldDefAsync(string sellerId, ExtraFieldDef field);
    Task DeleteFieldDefAsync(string sellerId, string id);
}
