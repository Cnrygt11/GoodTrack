using GoodTrack.API.Constants;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using GoodTrack.API.Models;

namespace GoodTrack.API.DTOs.Product;

public class CreateCatalogProductDto
{
    [Required(ErrorMessage = "Ürün kodu zorunludur.")]
    [MaxLength(100)]
    public string ProductCode { get; set; } = string.Empty;

    /// <summary>
    /// Güncellemede (PUT) <c>null</c> = "görsel değişmedi": mevcut görsel ve thumbnail korunur.
    /// Boş string <c>""</c> mevcut "görselsiz" anlamını korur. İstemci liste yanıtında tam
    /// görseli almadığından, görsele dokunmayan güncellemeler null gönderir.
    /// </summary>
    [MaxLength(ImageLimits.MaxBase64Length)]
    public string? Image { get; set; }

    /// <summary>Client'ta üretilen küçük thumbnail (~160px). Sipariş autofill'inde de kopyalanır.</summary>
    [MaxLength(ImageLimits.MaxThumbnailBase64Length)]
    public string? ThumbnailImage { get; set; }

    [Required(ErrorMessage = "Üretici ID zorunludur.")]
    [MaxLength(50)]
    [JsonPropertyName("mfrId")]
    public string ManufacturerId { get; set; } = string.Empty;

    [Required(ErrorMessage = "Üretici adı zorunludur.")]
    [MaxLength(100)]
    [JsonPropertyName("mfrName")]
    public string ManufacturerName { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Text { get; set; }

    [MaxLength(50)]
    public string? Length { get; set; }

    public Dictionary<string, ExtraValue>? Extras { get; set; }
}
