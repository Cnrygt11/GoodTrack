using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Models;
using GoodTrack.API.Constants;

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

    public async Task MarkProductsAsReadAsync(string userId, string role, string status, CancellationToken cancellationToken = default)
    {
        var query = _context.Products.AsQueryable();

        // 1. Filter by role ownership
        if (role == Roles.Seller)
        {
            query = query.Where(p => p.SellerId == userId && !p.IsReadBySeller);
        }
        else
        {
            query = query.Where(p => p.ManufacturerId == userId && !p.IsReadByMfr);
        }

        // 2. Filter by status buckets (matching MarkStatusAsReadAsync logic in ProductService)
        if (status.Equals("defective", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(p => p.Status == OrderStatus.Defective || p.Status == OrderStatus.Missing);
        }
        else if (status.Equals("shipped", StringComparison.OrdinalIgnoreCase))
        {
            if (role == Roles.Mfr)
            {
                query = query.Where(p => p.Status == OrderStatus.Shipped || p.Status == OrderStatus.Cancelled || p.Status == OrderStatus.ToShip);
            }
            else
            {
                query = query.Where(p => p.Status == OrderStatus.Shipped || p.Status == OrderStatus.Cancelled);
            }
        }
        else if (status.Equals("awaiting", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(p => p.Status == OrderStatus.Awaiting || p.Status == OrderStatus.Corrected);
        }
        else
        {
            query = query.Where(p => p.Status == status);
        }

        // 3. Execute bulk update
        if (role == Roles.Seller)
        {
            await query.ExecuteUpdateAsync(setters => setters.SetProperty(p => p.IsReadBySeller, true), cancellationToken);
        }
        else
        {
            await query.ExecuteUpdateAsync(setters => setters.SetProperty(p => p.IsReadByMfr, true), cancellationToken);
        }
    }
}
