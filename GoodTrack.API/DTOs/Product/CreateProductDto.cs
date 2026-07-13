using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using GoodTrack.API.Models;

namespace GoodTrack.API.DTOs.Product;

public class CreateProductDto
{
    [Required(ErrorMessage = "Ürün kodu zorunludur.")]
    [MaxLength(100)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(7_000_000)]
    public string? Image { get; set; }

    /// <summary>Client'ta üretilen küçük thumbnail (~160px). Yoksa Image'den türetilmez; null kalır.</summary>
    [MaxLength(500_000)]
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

    public int Quantity { get; set; } = 1;

    // Etsy kaynaklı siparişlerde doldurulur; manuel siparişlerde null kalır.
    public long? EtsyReceiptId { get; set; }
    public long? EtsyTransactionId { get; set; }

    [MaxLength(200)]
    public string? CustomerName { get; set; }

    [MaxLength(500)]
    public string? ShippingAddress { get; set; }

    [Required(ErrorMessage = "Üretici ID zorunludur.")]
    [MaxLength(50)]
    [JsonPropertyName("mfrId")]
    public string ManufacturerId { get; set; } = string.Empty;

    [Required(ErrorMessage = "Üretici adı zorunludur.")]
    [MaxLength(100)]
    [JsonPropertyName("mfrName")]
    public string ManufacturerName { get; set; } = string.Empty;
}
