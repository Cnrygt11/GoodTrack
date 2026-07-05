using System;
using System.ComponentModel.DataAnnotations;

namespace GoodTrack.API.Models;

public class EtsyConnection
{
    [Key]
    [MaxLength(100)]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string EtsyShopId { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string EtsyShopName { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string ApiKeyKeystring { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string ApiKeySharedSecret { get; set; } = string.Empty;

    [Required]
    [MaxLength(1000)]
    public string AccessToken { get; set; } = string.Empty;

    [Required]
    [MaxLength(1000)]
    public string RefreshToken { get; set; } = string.Empty;

    public DateTime TokenExpiresAt { get; set; }

    [MaxLength(200)]
    public string? WebhookSigningSecret { get; set; }

    public bool IsActive { get; set; } = true;
}
