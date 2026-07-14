using System.Collections.Generic;
using System.Threading.Tasks;
using GoodTrack.API.DTOs.Product;

namespace GoodTrack.API.Abstractions.Services;

public interface ICatalogService
{
    Task<List<CatalogProductResponseDto>> GetSellerCatalogAsync(string sellerId);

    /// <summary>Tek katalog ürününü TAM görseliyle döner (liste yanıtı görseli taşımaz).</summary>
    Task<CatalogProductResponseDto> GetCatalogProductAsync(string sellerId, string id);
    Task<CatalogProductResponseDto> AddCatalogProductAsync(string sellerId, CreateCatalogProductDto dto);
    Task<CatalogProductResponseDto> UpdateCatalogProductAsync(string sellerId, string id, CreateCatalogProductDto dto);
    Task DeleteCatalogProductAsync(string sellerId, string id);
}
