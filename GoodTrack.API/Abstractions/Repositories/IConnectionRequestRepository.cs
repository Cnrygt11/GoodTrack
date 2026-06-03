using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Repositories;

public interface IConnectionRequestRepository
{
    Task<ConnectionRequest?> GetByIdAsync(string id);
    Task<List<ConnectionRequest>> GetIncomingPendingRequestsAsync(string receiverId);
    Task<bool> HasPendingRequestAsync(string senderId, string receiverId);
    Task<List<ConnectionRequest>> GetSentRequestsAsync(string senderId);
    Task SaveAsync(ConnectionRequest request);
    Task DeleteAsync(string id);
}
