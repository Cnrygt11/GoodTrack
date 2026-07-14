using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Models;

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

    public async Task<List<CatalogProduct>> GetCatalogBySellerAsync(string sellerId, CancellationToken cancellationToken = default)
    {
        // Veritabanı Otomatik İyileştirme (Self-Healing): Geçersiz veya boş ID'li eski hatalı ürünleri temizle
        var brokenProducts = await _context.CatalogProducts
            .Where(c => c.SellerId == sellerId && (c.Id == "" || c.Id == null))
            .ToListAsync(cancellationToken);

        if (brokenProducts.Any())
        {
            _context.CatalogProducts.RemoveRange(brokenProducts);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return await _context.CatalogProducts
            .AsNoTracking()
            .Where(c => c.SellerId == sellerId)
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
