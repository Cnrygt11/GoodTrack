using System.ComponentModel.DataAnnotations;

namespace GoodTrack.API.DTOs.Auth;

public class ChangePasswordRequest
{
    [Required]
    [MaxLength(20)]
    public string OldPassword { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    [MaxLength(20)]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string ConfirmNewPassword { get; set; } = string.Empty;
}
