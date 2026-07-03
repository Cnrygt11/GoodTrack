using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.Models;

namespace GoodTrack.API.Services;

public sealed class FieldService : IFieldService
{
    private readonly IFieldRepository _fieldRepository;

    public FieldService(IFieldRepository fieldRepository)
    {
        _fieldRepository = fieldRepository;
    }

    public async Task<List<ExtraFieldDefResponseDto>> GetSellerFieldsAsync(string sellerId)
    {
        var fields = await _fieldRepository.GetFieldsBySellerAsync(sellerId);
        return fields.Select(MapToResponseDto).ToList();
    }

    public async Task<ExtraFieldDefResponseDto> CreateFieldDefAsync(string sellerId, CreateExtraFieldDefDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Type))
        {
            throw new ArgumentException("Geçersiz özellik verisi!");
        }

        var field = new ExtraFieldDef
        {
            Name = dto.Name,
            Type = dto.Type,
            Options = dto.Options ?? new List<string>(),
            CreatedBy = sellerId
        };

        await _fieldRepository.SaveAsync(field);
        return MapToResponseDto(field);
    }

    public async Task DeleteFieldDefAsync(string sellerId, string id)
    {
        var field = await _fieldRepository.GetByIdAsync(id);
        if (field == null)
        {
            throw new KeyNotFoundException("Özellik bulunamadı!");
        }

        if (field.CreatedBy != sellerId)
        {
            throw new UnauthorizedAccessException("Bu özelliği silme yetkiniz yok!");
        }

        await _fieldRepository.DeleteAsync(id);
    }

    private static ExtraFieldDefResponseDto MapToResponseDto(ExtraFieldDef field)
    {
        return new ExtraFieldDefResponseDto
        {
            Id = field.Id,
            Name = field.Name,
            Type = field.Type,
            Options = field.Options,
            CreatedBy = field.CreatedBy
        };
    }
}
