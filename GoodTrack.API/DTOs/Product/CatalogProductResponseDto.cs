using System.Collections.Generic;
using System.Text.Json.Serialization;
using GoodTrack.API.Models;

namespace GoodTrack.API.DTOs.Product;

public class CatalogProductResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string SellerId { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;

    /// <summary>
    /// Tam görsel. LİSTE yanıtlarında null döner (ağır base64 taşınmaz); tam görsel
    /// GET /catalog/{id} detay ucundan alınır. Listede yalnız <see cref="ThumbnailImage"/> taşınır.
    /// </summary>
    public string? Image { get; set; }

    public string? ThumbnailImage { get; set; }

    [JsonPropertyName("mfrId")]
    public string ManufacturerId { get; set; } = string.Empty;

    [JsonPropertyName("mfrName")]
    public string ManufacturerName { get; set; } = string.Empty;

    public string? Text { get; set; }
    public string? Length { get; set; }
    public Dictionary<string, ExtraValue>? Extras { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
}
