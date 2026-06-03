using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Models;

namespace GoodTrack.API.Services;

public class FieldService : IFieldService
{
    private readonly IFieldRepository _fieldRepository;

    public FieldService(IFieldRepository fieldRepository)
    {
        _fieldRepository = fieldRepository;
    }

    public async Task<List<ExtraFieldDef>> GetSellerFieldsAsync(string sellerId)
    {
        return await _fieldRepository.GetFieldsBySellerAsync(sellerId);
    }

    public async Task<ExtraFieldDef> CreateFieldDefAsync(string sellerId, ExtraFieldDef field)
    {
        if (field == null || string.IsNullOrWhiteSpace(field.Name) || string.IsNullOrWhiteSpace(field.Type))
        {
            throw new ArgumentException("Geçersiz özellik verisi!");
        }

        field.CreatedBy = sellerId;
        await _fieldRepository.SaveAsync(field);
        return field;
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
}
