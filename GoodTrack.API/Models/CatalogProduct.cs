using GoodTrack.API.Constants;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace GoodTrack.API.Models;

public class CatalogProduct
{
    public string Id { get; set; } = string.Empty;

    [MaxLength(50)]
    public string SellerId { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ProductCode { get; set; } = string.Empty;

    // Base64 image — max ~5MB binary
    [MaxLength(ImageLimits.MaxBase64Length)]
    public string Image { get; set; } = string.Empty;

    /// <summary>Liste/kartlarda gösterilen küçük thumbnail (~160px). Manuel'de base64, Etsy'de CDN URL.</summary>
    [MaxLength(ImageLimits.MaxThumbnailBase64Length)]
    public string? ThumbnailImage { get; set; }

    [MaxLength(50)]
    [JsonPropertyName("mfrId")]
    public string ManufacturerId { get; set; } = string.Empty;

    [MaxLength(100)]
    [JsonPropertyName("mfrName")]
    public string ManufacturerName { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Text { get; set; }

    [MaxLength(50)]
    public string? Length { get; set; }

    public Dictionary<string, ExtraValue>? Extras { get; set; }

    public string CreatedAt { get; set; } = string.Empty;
}
