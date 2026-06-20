using System.ComponentModel.DataAnnotations;

namespace GoodTrack.API.DTOs.Auth;

public class RegisterRequest
{
    [Required]
    [MinLength(3)]
    [MaxLength(15)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    [MaxLength(20)]
    public string Password { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string ConfirmPassword { get; set; } = string.Empty;

    [Required]
    [MaxLength(10)]
    public string Role { get; set; } = string.Empty; // "seller" or "mfr" or "admin"

    public string? AdminSecret { get; set; }
}
