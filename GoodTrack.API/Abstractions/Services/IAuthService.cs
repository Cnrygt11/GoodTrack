using GoodTrack.API.DTOs.Auth;

namespace GoodTrack.API.Abstractions.Services;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task RegisterAsync(RegisterRequest request, string baseUrl);
    Task VerifyEmailAsync(string username, string token);
    Task<List<UserDto>> GetConnectionsAsync(string userId);
    Task RemoveConnectionAsync(string userId, string targetId);
    Task<List<UserDto>> GetAvailableManufacturersAsync();
    Task SendConnectionRequestAsync(string senderId, string senderUsername, string senderRole, string targetUsername);
    Task<List<ConnectionRequestDto>> GetIncomingRequestsAsync(string receiverId);
    Task<List<ConnectionRequestDto>> GetSentRequestsAsync(string senderId);
    Task AcceptConnectionRequestAsync(string receiverId, string requestId);
    Task RejectConnectionRequestAsync(string receiverId, string requestId);
    Task DeleteConnectionRequestAsync(string userId, string requestId);
    Task<UserProfileDto> GetProfileAsync(string userId);
    Task<bool> VerifyPasswordAsync(string userId, string password);
    Task ChangePasswordAsync(string userId, string oldPassword, string newPassword, string confirmNewPassword);
}

