using GoodTrack.API.Constants;
using System.ComponentModel.DataAnnotations;

namespace GoodTrack.API.DTOs.Product;

public class UpdateStatusRequest
{
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? DefectNote { get; set; }

    // Base64 image — max ~5MB binary
    [MaxLength(ImageLimits.MaxBase64Length)]
    public string? DefectImage { get; set; }
}
