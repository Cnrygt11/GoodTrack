namespace GoodTrack.API.DTOs.Product;

public class UpdateStatusRequest
{
    public string Status { get; set; } = string.Empty;
    public string? DefectNote { get; set; }
    public string? DefectImage { get; set; }
}
