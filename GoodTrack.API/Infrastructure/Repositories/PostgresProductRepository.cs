using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Repositories;

public sealed class PostgresProductRepository : IProductRepository
{
    private readonly AppDbContext _context;

    public PostgresProductRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Product?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        return await _context.Products.FindAsync(new object?[] { id }, cancellationToken);
    }

    public async Task<List<Product>> GetProductsBySellerAsync(string sellerId, CancellationToken cancellationToken = default)
    {
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.SellerId == sellerId)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<Product>> GetProductsByManufacturerAsync(string mfrId, CancellationToken cancellationToken = default)
    {
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.ManufacturerId == mfrId)
            .ToListAsync(cancellationToken);
    }

    public async Task SaveAsync(Product product, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(product.Id))
        {
            product.Id = Guid.NewGuid().ToString();
            await _context.Products.AddAsync(product, cancellationToken);
        }
        else
        {
            _context.Products.Update(product);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        var product = await _context.Products.FindAsync(new object?[] { id }, cancellationToken);
        if (product != null)
        {
            _context.Products.Remove(product);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    public Task<int> MigrateStatusesAsync()
    {
        // Not applicable for PostgreSQL — returns 0
        return Task.FromResult(0);
    }
}
