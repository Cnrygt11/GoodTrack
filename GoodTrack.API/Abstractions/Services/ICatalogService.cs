using System.Collections.Generic;
using System.Threading.Tasks;
using GoodTrack.API.DTOs.Product;

namespace GoodTrack.API.Abstractions.Services;

public interface ICatalogService
{
    Task<List<CatalogProductResponseDto>> GetSellerCatalogAsync(string sellerId);
    Task<CatalogProductResponseDto> AddCatalogProductAsync(string sellerId, CreateCatalogProductDto dto);
    Task<CatalogProductResponseDto> UpdateCatalogProductAsync(string sellerId, string id, CreateCatalogProductDto dto);
    Task DeleteCatalogProductAsync(string sellerId, string id);
}
