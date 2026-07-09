using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Repositories;

public sealed class PostgresEtsyConnectionRepository : IEtsyConnectionRepository
{
    private readonly AppDbContext _context;

    public PostgresEtsyConnectionRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<EtsyConnection?> GetAsync(string userId, string shopId, CancellationToken cancellationToken = default)
    {
        return _context.EtsyConnections
            .FirstOrDefaultAsync(c => c.UserId == userId && c.EtsyShopId == shopId, cancellationToken);
    }

    public Task<List<EtsyConnection>> GetAllForUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        return _context.EtsyConnections
            .Where(c => c.UserId == userId)
            .ToListAsync(cancellationToken);
    }

    public Task<List<EtsyConnection>> GetActiveForUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        return _context.EtsyConnections
            .Where(c => c.UserId == userId && c.IsActive)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(EtsyConnection connection, CancellationToken cancellationToken = default)
    {
        await _context.EtsyConnections.AddAsync(connection, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _context.SaveChangesAsync(cancellationToken);
    }
}
