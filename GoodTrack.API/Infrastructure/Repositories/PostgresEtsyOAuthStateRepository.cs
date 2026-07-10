using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Repositories;

public sealed class PostgresEtsyOAuthStateRepository : IEtsyOAuthStateRepository
{
    private readonly AppDbContext _context;

    public PostgresEtsyOAuthStateRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(EtsyOAuthState state, CancellationToken cancellationToken = default)
    {
        await _context.EtsyOAuthStates.AddAsync(state, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<EtsyOAuthState?> ConsumeAsync(string state, CancellationToken cancellationToken = default)
    {
        var entity = await _context.EtsyOAuthStates
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.State == state, cancellationToken);

        if (entity == null)
        {
            return null;
        }

        // Tek kullanım garantisi: satırı silmeyi başaran çağrı state'i tüketmiş sayılır.
        // Eşzamanlı ikinci bir çağrı 0 satır siler ve null alır.
        var deleted = await _context.EtsyOAuthStates
            .Where(s => s.State == state)
            .ExecuteDeleteAsync(cancellationToken);

        if (deleted == 0)
        {
            return null;
        }

        // Süresi dolmuş state kabul edilmez (yine de silinmiş olur — temizlik).
        return entity.ExpiresAt <= DateTime.UtcNow ? null : entity;
    }

    public Task<int> DeleteExpiredAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        return _context.EtsyOAuthStates
            .Where(s => s.ExpiresAt <= now)
            .ExecuteDeleteAsync(cancellationToken);
    }
}
