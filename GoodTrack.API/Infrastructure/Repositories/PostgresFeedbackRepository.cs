using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Repositories;

public sealed class PostgresFeedbackRepository : IFeedbackRepository
{
    private readonly AppDbContext _context;

    public PostgresFeedbackRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task SaveAsync(Feedback feedback, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(feedback.Id))
        {
            feedback.Id = Guid.NewGuid().ToString();
            await _context.Feedbacks.AddAsync(feedback, cancellationToken);
        }
        else
        {
            _context.Feedbacks.Update(feedback);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<Feedback>> GetAllFeedbacksAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Feedbacks
            .AsNoTracking()
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);
    }
}
