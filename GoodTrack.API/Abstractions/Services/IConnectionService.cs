using System.Collections.Generic;
using System.Threading.Tasks;
using GoodTrack.API.DTOs.Auth;

namespace GoodTrack.API.Abstractions.Services;

public interface IConnectionService
{
    Task<List<UserDto>> GetConnectionsAsync(string userId);
    Task RemoveConnectionAsync(string userId, string targetId);
    Task<List<UserDto>> GetAvailableManufacturersAsync();
    Task SendConnectionRequestAsync(string senderId, string senderUsername, string senderRole, string targetUsername);
    Task<List<ConnectionRequestDto>> GetIncomingRequestsAsync(string receiverId);
    Task<List<ConnectionRequestDto>> GetSentRequestsAsync(string senderId);
    Task AcceptConnectionRequestAsync(string receiverId, string requestId);
    Task RejectConnectionRequestAsync(string receiverId, string requestId);
    Task DeleteConnectionRequestAsync(string userId, string requestId);
}
