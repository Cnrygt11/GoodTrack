using System.ComponentModel.DataAnnotations;

namespace GoodTrack.API.DTOs.Auth;

public class LoginRequest
{
    [Required]
    [MaxLength(15)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Password { get; set; } = string.Empty;
}
