using GoodTrack.API.Constants;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using GoodTrack.API.Models;

namespace GoodTrack.API.DTOs.Product;

public class UpdateProductDto
{
    [Required(ErrorMessage = "Ürün kodu zorunludur.")]
    [MaxLength(100)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(ImageLimits.MaxBase64Length)]
    public string? Image { get; set; }

    /// <summary>Client'ta üretilen küçük thumbnail (~160px).</summary>
    [MaxLength(ImageLimits.MaxThumbnailBase64Length)]
    public string? ThumbnailImage { get; set; }

    /// <summary>
    /// Görsel katalogtan geliyorsa katalog ürününün id'si. Doluysa <see cref="Image"/> yok sayılır;
    /// sipariş görseli katalog referansı üzerinden çözülür (tam görsel kopyalanmaz).
    /// </summary>
    [MaxLength(50)]
    public string? CatalogProductId { get; set; }

    [MaxLength(1000)]
    public string? Text { get; set; }

    [MaxLength(50)]
    public string? Length { get; set; }

    public Dictionary<string, ExtraValue>? Extras { get; set; }

    [Required(ErrorMessage = "Üretici ID zorunludur.")]
    [MaxLength(50)]
    [JsonPropertyName("mfrId")]
    public string ManufacturerId { get; set; } = string.Empty;

    [Required(ErrorMessage = "Üretici adı zorunludur.")]
    [MaxLength(100)]
    [JsonPropertyName("mfrName")]
    public string ManufacturerName { get; set; } = string.Empty;
}
