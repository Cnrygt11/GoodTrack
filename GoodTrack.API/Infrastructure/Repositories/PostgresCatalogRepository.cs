using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Models;
using GoodTrack.API.DTOs.Product;

namespace GoodTrack.API.Infrastructure.Repositories;

public sealed class PostgresCatalogRepository : ICatalogRepository
{
    private readonly AppDbContext _context;

    public PostgresCatalogRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<CatalogProduct?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        return await _context.CatalogProducts.FindAsync(new object?[] { id }, cancellationToken);
    }

    public async Task<List<CatalogProductResponseDto>> GetCatalogSummariesBySellerAsync(string sellerId, CancellationToken cancellationToken = default)
    {
        // Liste projeksiyonu: tam Image null bırakılır (DB'den çekilmez), yalnız ThumbnailImage
        // taşınır. Thumbnail'siz eski kayıtlarda tam görsele düşülür (kırık görsel olmaz);
        // yeni yüklemeler gerçek küçük thumbnail gönderdiğinden liste yükü progresif azalır.
        return await _context.CatalogProducts
            .AsNoTracking()
            .Where(c => c.SellerId == sellerId)
            .Select(c => new CatalogProductResponseDto
            {
                Id = c.Id,
                SellerId = c.SellerId,
                ProductCode = c.ProductCode,
                Image = null,
                ThumbnailImage = c.ThumbnailImage != null ? c.ThumbnailImage : c.Image,
                ManufacturerId = c.ManufacturerId,
                ManufacturerName = c.ManufacturerName,
                Text = c.Text,
                Length = c.Length,
                Extras = c.Extras,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> IsImageUsedBySellerAsync(string sellerId, string imageUrl, string? excludeCatalogProductId, CancellationToken cancellationToken = default)
    {
        return await _context.CatalogProducts
            .AsNoTracking()
            .AnyAsync(c => c.SellerId == sellerId
                && c.Image == imageUrl
                && (excludeCatalogProductId == null || c.Id != excludeCatalogProductId), cancellationToken);
    }

    public async Task<bool> HasProductCodeAsync(string sellerId, string code)
    {
        return await _context.CatalogProducts
            .AsNoTracking()
            .AnyAsync(c => c.SellerId == sellerId && c.ProductCode == code);
    }

    public async Task SaveAsync(CatalogProduct product, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(product.Id))
        {
            product.Id = Guid.NewGuid().ToString();
            await _context.CatalogProducts.AddAsync(product, cancellationToken);
        }
        else
        {
            _context.CatalogProducts.Update(product);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        var product = await _context.CatalogProducts.FindAsync(new object?[] { id }, cancellationToken);
        if (product != null)
        {
            _context.CatalogProducts.Remove(product);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
