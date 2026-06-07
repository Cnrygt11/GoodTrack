namespace GoodTrack.API.DTOs.Product;

public class ToggleDefectiveRequest
{
    public bool IsDefective { get; set; }
    public string? DefectNote { get; set; }
    public string? DefectImage { get; set; }
}
