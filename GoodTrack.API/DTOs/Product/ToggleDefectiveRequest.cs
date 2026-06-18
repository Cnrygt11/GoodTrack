using System.ComponentModel.DataAnnotations;

namespace GoodTrack.API.DTOs.Product;

public class ToggleDefectiveRequest
{
    public bool IsDefective { get; set; }

    [MaxLength(1000)]
    public string? DefectNote { get; set; }

    // Base64 image — max ~5MB binary
    [MaxLength(7_000_000)]
    public string? DefectImage { get; set; }
}
