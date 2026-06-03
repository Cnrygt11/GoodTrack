using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Models;

namespace GoodTrack.API.Services;

public class CatalogService : ICatalogService
{
    private readonly ICatalogRepository _catalogRepository;
    private readonly IProductRepository _productRepository;
    private readonly IImageStorageService _imageStorageService;

    public CatalogService(
        ICatalogRepository catalogRepository, 
        IProductRepository productRepository,
        IImageStorageService imageStorageService)
    {
        _catalogRepository = catalogRepository;
        _productRepository = productRepository;
        _imageStorageService = imageStorageService;
    }

    public async Task<List<CatalogProduct>> GetSellerCatalogAsync(string sellerId)
    {
        return await _catalogRepository.GetCatalogBySellerAsync(sellerId);
    }

    public async Task<CatalogProduct> AddCatalogProductAsync(string sellerId, CatalogProduct product)
    {
        if (product == null || string.IsNullOrWhiteSpace(product.ProductCode))
        {
            throw new ArgumentException("Ürün kodu zorunludur!");
        }

        if (string.IsNullOrWhiteSpace(product.MfrId) || string.IsNullOrWhiteSpace(product.MfrName))
        {
            throw new ArgumentException("Ürüne atanacak üretici zorunludur!");
        }

        var cleanCode = product.ProductCode.Trim();

        var exists = await _catalogRepository.HasProductCodeAsync(sellerId, cleanCode);
        if (exists)
        {
            throw new ArgumentException("Bu ürün kodu kataloğunuzda zaten kayıtlı!");
        }

        product.ProductCode = cleanCode;
        product.SellerId = sellerId;
        product.CreatedAt = DateTime.UtcNow.ToString("o");

        product.Image = await _imageStorageService.StoreImageAsync(product.Image) ?? string.Empty;


        await _catalogRepository.SaveAsync(product);
        return product;
    }

    public async Task<CatalogProduct> UpdateCatalogProductAsync(string sellerId, string id, CatalogProduct updatedProduct)
    {
        if (updatedProduct == null || string.IsNullOrWhiteSpace(updatedProduct.ProductCode))
        {
            throw new ArgumentException("Ürün kodu zorunludur!");
        }

        if (string.IsNullOrWhiteSpace(updatedProduct.MfrId) || string.IsNullOrWhiteSpace(updatedProduct.MfrName))
        {
            throw new ArgumentException("Ürüne atanacak üretici zorunludur!");
        }

        var existing = await _catalogRepository.GetByIdAsync(id);
        if (existing == null)
        {
            throw new KeyNotFoundException("Katalog ürünü bulunamadı.");
        }

        if (existing.SellerId != sellerId)
        {
            throw new UnauthorizedAccessException("Bu katalog ürününü düzenleme yetkiniz yok.");
        }

        var cleanCode = updatedProduct.ProductCode.Trim();

        // If product code changed, check uniqueness
        if (!string.Equals(existing.ProductCode, cleanCode, StringComparison.OrdinalIgnoreCase))
        {
            var exists = await _catalogRepository.HasProductCodeAsync(sellerId, cleanCode);
            if (exists)
            {
                throw new ArgumentException("Bu ürün kodu kataloğunuzda zaten kayıtlı!");
            }
        }

        // Handle image changes:
        if (updatedProduct.Image != existing.Image)
        {
            // If the old product had a local file, delete it safely
            if (!string.IsNullOrEmpty(existing.Image))
            {
                await TryDeleteImageAsync(existing.Image, sellerId, id);
            }

            // Store the new image
            updatedProduct.Image = await _imageStorageService.StoreImageAsync(updatedProduct.Image) ?? string.Empty;
        }

        existing.ProductCode = cleanCode;
        existing.MfrId = updatedProduct.MfrId;
        existing.MfrName = updatedProduct.MfrName;
        existing.Image = updatedProduct.Image;

        await _catalogRepository.SaveAsync(existing);
        return existing;
    }

    public async Task DeleteCatalogProductAsync(string sellerId, string id)
    {
        var product = await _catalogRepository.GetByIdAsync(id);
        if (product == null)
        {
            throw new KeyNotFoundException("Katalog ürünü bulunamadı.");
        }

        if (product.SellerId != sellerId)
        {
            throw new UnauthorizedAccessException("Bu katalog ürününü silme yetkiniz yok.");
        }

        if (!string.IsNullOrEmpty(product.Image))
        {
            await TryDeleteImageAsync(product.Image, sellerId, id);
        }

        await _catalogRepository.DeleteAsync(id);
    }

    private async Task TryDeleteImageAsync(string? imageUrl, string sellerId, string currentCatalogProductId)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return;

        // Check if any other catalog product uses this image
        var catalog = await _catalogRepository.GetCatalogBySellerAsync(sellerId);
        bool isUsedInCatalog = catalog.Exists(c => c.Id != currentCatalogProductId && c.Image == imageUrl);
        if (isUsedInCatalog) return;

        // Check if any active orders/products use this image
        var orders = await _productRepository.GetProductsBySellerAsync(sellerId);
        bool isUsedInOrders = orders.Exists(p => p.Image == imageUrl);
        if (isUsedInOrders) return;

        // Safe to delete from disk
        await _imageStorageService.DeleteImageAsync(imageUrl);
    }

}
