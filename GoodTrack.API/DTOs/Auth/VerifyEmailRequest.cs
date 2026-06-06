namespace GoodTrack.API.DTOs.Auth;

public class VerifyEmailRequest
{
    public string Username { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}
