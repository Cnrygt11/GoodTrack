using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Repositories;

/// <summary>
/// PostgreSQL implementation of the ICreditsRepository.
/// </summary>
public sealed class CreditsRepository : ICreditsRepository
{
    private readonly AppDbContext _context;

    /// <summary>
    /// Initializes a new instance of the <see cref="CreditsRepository"/> class.
    /// </summary>
    /// <param name="context">The database context.</param>
    public CreditsRepository(AppDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc />
    public async Task<UserCredit?> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await _context.UserCredits
            .FirstOrDefaultAsync(c => c.UserId == userId, cancellationToken);
    }

    /// <inheritdoc />
    public async Task SaveAsync(UserCredit userCredit, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userCredit.Id))
        {
            userCredit.Id = Guid.NewGuid().ToString();
            await _context.UserCredits.AddAsync(userCredit, cancellationToken);
        }
        else
        {
            _context.UserCredits.Update(userCredit);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}
