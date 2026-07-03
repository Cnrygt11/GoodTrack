using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Models;
using GoodTrack.API.Constants;

namespace GoodTrack.API.Infrastructure.Repositories;

public sealed class PostgresConnectionRequestRepository : IConnectionRequestRepository
{
    private readonly AppDbContext _context;

    public PostgresConnectionRequestRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ConnectionRequest?> GetByIdAsync(string id)
    {
        return await _context.ConnectionRequests.FindAsync(id);
    }

    public async Task<List<ConnectionRequest>> GetIncomingPendingRequestsAsync(string receiverId)
    {
        return await _context.ConnectionRequests
            .AsNoTracking()
            .Where(r => r.ReceiverId == receiverId && r.Status == ConnectionRequestStatus.Pending)
            .ToListAsync();
    }

    public async Task<bool> HasPendingRequestAsync(string senderId, string receiverId)
    {
        return await _context.ConnectionRequests
            .AsNoTracking()
            .AnyAsync(r => r.SenderId == senderId && r.ReceiverId == receiverId && r.Status == ConnectionRequestStatus.Pending);
    }

    public async Task<List<ConnectionRequest>> GetSentRequestsAsync(string senderId)
    {
        return await _context.ConnectionRequests
            .AsNoTracking()
            .Where(r => r.SenderId == senderId)
            .ToListAsync();
    }

    public async Task SaveAsync(ConnectionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Id))
        {
            request.Id = Guid.NewGuid().ToString();
            await _context.ConnectionRequests.AddAsync(request);
        }
        else
        {
            _context.ConnectionRequests.Update(request);
        }

        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(string id)
    {
        var request = await _context.ConnectionRequests.FindAsync(id);
        if (request != null)
        {
            _context.ConnectionRequests.Remove(request);
            await _context.SaveChangesAsync();
        }
    }
}
