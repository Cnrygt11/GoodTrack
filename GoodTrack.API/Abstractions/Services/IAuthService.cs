using System.Threading.Tasks;
using GoodTrack.API.DTOs.Auth;

namespace GoodTrack.API.Abstractions.Services;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task RegisterAsync(RegisterRequest request, string baseUrl);
    Task<bool> VerifyPasswordAsync(string userId, string password);
    Task ChangePasswordAsync(string userId, string oldPassword, string newPassword, string confirmNewPassword);
    Task<LoginResponse> RefreshTokenAsync(TokenRefreshRequest request);
    Task LogoutAsync(string userId);
}
