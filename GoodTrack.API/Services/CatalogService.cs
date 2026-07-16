using GoodTrack.API.Constants;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.Models;

namespace GoodTrack.API.Services;

public sealed class CatalogService : ICatalogService
{
    private readonly ICatalogRepository _catalogRepository;
    private readonly IImageStorageService _imageStorageService;
    private readonly IImageCleanupService _imageCleanupService;

    public CatalogService(
        ICatalogRepository catalogRepository,
        IImageStorageService imageStorageService,
        IImageCleanupService imageCleanupService)
    {
        _catalogRepository = catalogRepository;
        _imageStorageService = imageStorageService;
        _imageCleanupService = imageCleanupService;
    }

    public async Task<List<CatalogProductResponseDto>> GetSellerCatalogAsync(string sellerId)
    {
        // Liste hafif projeksiyonla gelir: tam Image DB'den çekilmez, yalnız ThumbnailImage taşınır.
        return await _catalogRepository.GetCatalogSummariesBySellerAsync(sellerId);
    }

    public async Task<CatalogProductResponseDto> GetCatalogProductAsync(string sellerId, string id)
    {
        var product = await _catalogRepository.GetByIdAsync(id);
        if (product == null)
        {
            throw new KeyNotFoundException(Messages.Catalog.NotFound);
        }

        if (product.SellerId != sellerId)
        {
            throw new UnauthorizedAccessException("Bu katalog ürününü görüntüleme yetkiniz yok.");
        }

        return MapToResponseDto(product);
    }

    public async Task<CatalogProductResponseDto> AddCatalogProductAsync(string sellerId, CreateCatalogProductDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.ProductCode))
        {
            throw new ArgumentException(Messages.Catalog.CodeRequired);
        }

        if (string.IsNullOrWhiteSpace(dto.ManufacturerId) || string.IsNullOrWhiteSpace(dto.ManufacturerName))
        {
            throw new ArgumentException(Messages.Catalog.ManufacturerRequired);
        }

        var cleanCode = dto.ProductCode.Trim();

        var exists = await _catalogRepository.HasProductCodeAsync(sellerId, cleanCode);
        if (exists)
        {
            throw new ArgumentException(Messages.Catalog.DuplicateCode);
        }

        var product = new CatalogProduct
        {
            ProductCode = cleanCode,
            SellerId = sellerId,
            CreatedAt = DateTime.UtcNow.ToString("o"),
            ManufacturerId = dto.ManufacturerId,
            ManufacturerName = dto.ManufacturerName,
            Text = dto.Text,
            Length = dto.Length,
            Extras = dto.Extras
        };

        product.Image = await _imageStorageService.StoreImageAsync(dto.Image) ?? string.Empty;
        product.ThumbnailImage = dto.ThumbnailImage;

        await _catalogRepository.SaveAsync(product);
        return MapToResponseDto(product);
    }

    public async Task<CatalogProductResponseDto> UpdateCatalogProductAsync(string sellerId, string id, CreateCatalogProductDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.ProductCode))
        {
            throw new ArgumentException(Messages.Catalog.CodeRequired);
        }

        if (string.IsNullOrWhiteSpace(dto.ManufacturerId) || string.IsNullOrWhiteSpace(dto.ManufacturerName))
        {
            throw new ArgumentException(Messages.Catalog.ManufacturerRequired);
        }

        var existing = await _catalogRepository.GetByIdAsync(id);
        if (existing == null)
        {
            throw new KeyNotFoundException(Messages.Catalog.NotFound);
        }

        if (existing.SellerId != sellerId)
        {
            throw new UnauthorizedAccessException("Bu katalog ürününü düzenleme yetkiniz yok.");
        }

        var cleanCode = dto.ProductCode.Trim();

        // If product code changed, check uniqueness
        if (!string.Equals(existing.ProductCode, cleanCode, StringComparison.OrdinalIgnoreCase))
        {
            var exists = await _catalogRepository.HasProductCodeAsync(sellerId, cleanCode);
            if (exists)
            {
                throw new ArgumentException(Messages.Catalog.DuplicateCode);
            }
        }

        // Görsel değişikliği: yalnız DOLU ve mevcut değerden FARKLI bir görsel geldiğinde
        // değiştirilir. null/boş = "görsel değişmedi" (liste yanıtı tam görseli taşımadığından
        // istemci, görsele dokunmayan güncellemelerde — ör. üretici atama — null gönderir).
        // İstemcide "görseli kaldır" özelliği yoktur; bu kural eski cache'li SPA'nın görseli
        // yanlışlıkla silmesini de engeller.
        if (!string.IsNullOrEmpty(dto.Image) && dto.Image != existing.Image)
        {
            // If the old product had a local file, delete it safely
            if (!string.IsNullOrEmpty(existing.Image))
            {
                await _imageCleanupService.DeleteCatalogImageIfUnusedAsync(existing.Image, sellerId, id);
            }

            // Store the new image
            existing.Image = await _imageStorageService.StoreImageAsync(dto.Image) ?? string.Empty;
            existing.ThumbnailImage = dto.ThumbnailImage;
        }

        existing.ProductCode = cleanCode;
        existing.ManufacturerId = dto.ManufacturerId;
        existing.ManufacturerName = dto.ManufacturerName;
        existing.Text = dto.Text;
        existing.Length = dto.Length;
        existing.Extras = dto.Extras;

        await _catalogRepository.SaveAsync(existing);
        return MapToResponseDto(existing);
    }

    public async Task DeleteCatalogProductAsync(string sellerId, string id)
    {
        var product = await _catalogRepository.GetByIdAsync(id);
        if (product == null)
        {
            throw new KeyNotFoundException(Messages.Catalog.NotFound);
        }

        if (product.SellerId != sellerId)
        {
            throw new UnauthorizedAccessException("Bu katalog ürününü silme yetkiniz yok.");
        }

        if (!string.IsNullOrEmpty(product.Image))
        {
            await _imageCleanupService.DeleteCatalogImageIfUnusedAsync(product.Image, sellerId, id);
        }

        await _catalogRepository.DeleteAsync(id);
    }

    private static CatalogProductResponseDto MapToResponseDto(CatalogProduct product)
    {
        return new CatalogProductResponseDto
        {
            Id = product.Id,
            ProductCode = product.ProductCode,
            Image = product.Image,
            ThumbnailImage = product.ThumbnailImage,
            Text = product.Text,
            Length = product.Length,
            Extras = product.Extras,
            CreatedAt = product.CreatedAt,
            SellerId = product.SellerId,
            ManufacturerId = product.ManufacturerId,
            ManufacturerName = product.ManufacturerName
        };
    }
}
