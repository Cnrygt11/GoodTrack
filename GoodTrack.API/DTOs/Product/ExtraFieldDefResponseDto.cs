using System.Collections.Generic;

namespace GoodTrack.API.DTOs.Product;

public class ExtraFieldDefResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public string CreatedBy { get; set; } = string.Empty;
}
