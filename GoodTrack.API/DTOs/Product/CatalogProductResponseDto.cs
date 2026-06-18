using System.Collections.Generic;
using System.Text.Json.Serialization;
using GoodTrack.API.Models;

namespace GoodTrack.API.DTOs.Product;

public class CatalogProductResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string SellerId { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;
    public string Image { get; set; } = string.Empty;

    [JsonPropertyName("mfrId")]
    public string ManufacturerId { get; set; } = string.Empty;

    [JsonPropertyName("mfrName")]
    public string ManufacturerName { get; set; } = string.Empty;

    public string? Text { get; set; }
    public string? Length { get; set; }
    public Dictionary<string, ExtraValue>? Extras { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
}
