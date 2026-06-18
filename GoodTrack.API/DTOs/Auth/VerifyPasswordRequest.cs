using System.ComponentModel.DataAnnotations;

namespace GoodTrack.API.DTOs.Auth;

public class VerifyPasswordRequest
{
    [Required]
    [MaxLength(20)]
    public string Password { get; set; } = string.Empty;
}
