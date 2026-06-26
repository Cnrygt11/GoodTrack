using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Repositories;

public sealed class PostgresUserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public PostgresUserRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        return await _context.Users.FindAsync(new object?[] { id }, cancellationToken);
    }

    public async Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Username == username, cancellationToken);
    }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
    }

    public async Task<List<User>> GetManufacturersAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .Where(u => u.Role == "mfr")
            .ToListAsync(cancellationToken);
    }

    public async Task<(List<User> Items, string? NextCursor)> SearchManufacturersAsync(
        string? city,
        string? keyword,
        string? cursor,
        int limit,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Users
            .AsNoTracking()
            .Where(u => u.Role == "mfr" && u.IsVisibleToSellers);

        if (!string.IsNullOrWhiteSpace(city))
        {
            query = query.Where(u => EF.Functions.ILike(u.City, city));
        }

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            query = query.Where(u => u.Keywords.Contains(keyword));
        }

        if (!string.IsNullOrWhiteSpace(cursor))
        {
            query = query.Where(u => u.Id.CompareTo(cursor) > 0);
        }

        query = query.OrderBy(u => u.Id);

        var items = await query.Take(limit + 1).ToListAsync(cancellationToken);

        string? nextCursor = null;
        if (items.Count > limit)
        {
            items.RemoveAt(limit);
            nextCursor = items[^1].Id;
        }

        return (items, nextCursor);
    }

    public async Task SaveAsync(User user, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(user.Id))
        {
            user.Id = Guid.NewGuid().ToString();
            await _context.Users.AddAsync(user, cancellationToken);
        }
        else
        {
            _context.Users.Update(user);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<User>> GetAllUsersAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task DeleteUserAsync(string id, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users.FindAsync(new object?[] { id }, cancellationToken);
        if (user != null)
        {
            _context.Users.Remove(user);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
