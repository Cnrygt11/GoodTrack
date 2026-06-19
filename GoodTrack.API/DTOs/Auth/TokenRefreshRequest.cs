namespace GoodTrack.API.DTOs.Auth;

public class TokenRefreshRequest
{
    public string Token { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
}
