using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Repositories;

public sealed class PostgresFieldRepository : IFieldRepository
{
    private readonly AppDbContext _context;

    public PostgresFieldRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ExtraFieldDef?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        return await _context.ExtraFieldDefs.FindAsync(new object?[] { id }, cancellationToken);
    }

    public async Task<List<ExtraFieldDef>> GetFieldsBySellerAsync(string sellerId, CancellationToken cancellationToken = default)
    {
        return await _context.ExtraFieldDefs
            .AsNoTracking()
            .Where(f => f.CreatedBy == sellerId)
            .ToListAsync(cancellationToken);
    }

    public async Task SaveAsync(ExtraFieldDef field, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(field.Id))
        {
            field.Id = Guid.NewGuid().ToString();
            await _context.ExtraFieldDefs.AddAsync(field, cancellationToken);
        }
        else
        {
            _context.ExtraFieldDefs.Update(field);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        var field = await _context.ExtraFieldDefs.FindAsync(new object?[] { id }, cancellationToken);
        if (field != null)
        {
            _context.ExtraFieldDefs.Remove(field);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
