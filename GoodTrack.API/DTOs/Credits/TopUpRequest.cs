using System.ComponentModel.DataAnnotations;

namespace GoodTrack.API.DTOs.Credits;

/// <summary>Kredi paketi satın alma isteği (bkz. SubscriptionPlanCatalog.Packages).</summary>
public class TopUpRequest
{
    [Required]
    [MaxLength(50)]
    public string PackageId { get; set; } = string.Empty;
}
