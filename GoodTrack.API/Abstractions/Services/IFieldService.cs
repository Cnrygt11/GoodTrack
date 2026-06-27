using System.Collections.Generic;
using System.Threading.Tasks;
using GoodTrack.API.DTOs.Product;

namespace GoodTrack.API.Abstractions.Services;

public interface IFieldService
{
    Task<List<ExtraFieldDefResponseDto>> GetSellerFieldsAsync(string sellerId);
    Task<ExtraFieldDefResponseDto> CreateFieldDefAsync(string sellerId, CreateExtraFieldDefDto dto);
    Task DeleteFieldDefAsync(string sellerId, string id);
}
