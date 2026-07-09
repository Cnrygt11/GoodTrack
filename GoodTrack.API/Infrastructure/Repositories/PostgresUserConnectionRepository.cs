using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Repositories;

public sealed class PostgresUserConnectionRepository : IUserConnectionRepository
{
    private readonly AppDbContext _context;

    public PostgresUserConnectionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<UserConnection>> GetConnectionsByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await _context.Set<UserConnection>()
            .AsNoTracking()
            .Where(c => c.SellerId == userId || c.ManufacturerId == userId)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> AreConnectedAsync(string sellerId, string manufacturerId, CancellationToken cancellationToken = default)
    {
        return await _context.Set<UserConnection>()
            .AsNoTracking()
            .AnyAsync(c => (c.SellerId == sellerId && c.ManufacturerId == manufacturerId) ||
                           (c.SellerId == manufacturerId && c.ManufacturerId == sellerId), cancellationToken);
    }

    public async Task SaveAsync(UserConnection connection, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connection.Id))
        {
            connection.Id = Guid.NewGuid().ToString();
            connection.ConnectedAt = DateTime.UtcNow;
            await _context.Set<UserConnection>().AddAsync(connection, cancellationToken);
        }
        else
        {
            _context.Set<UserConnection>().Update(connection);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(string sellerId, string manufacturerId, CancellationToken cancellationToken = default)
    {
        var conn = await _context.Set<UserConnection>()
            .FirstOrDefaultAsync(c => (c.SellerId == sellerId && c.ManufacturerId == manufacturerId) ||
                                      (c.SellerId == manufacturerId && c.ManufacturerId == sellerId), cancellationToken);

        if (conn != null)
        {
            _context.Set<UserConnection>().Remove(conn);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
