using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace GoodTrack.API.Models;

public class Product
{
    public string Id { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Code { get; set; } = string.Empty;

    // Base64 image — max ~5MB binary
    [MaxLength(7_000_000)]
    public string? Image { get; set; }

    [MaxLength(1000)]
    public string? Text { get; set; }

    [MaxLength(50)]
    public string? Length { get; set; }

    public Dictionary<string, ExtraValue>? Extras { get; set; }

    /// <summary>
    /// Sipariş adedi. Aynı ürünün aynı ekstra özelliklerle birden fazla alınması
    /// tek sipariş kartında bu adetle gösterilir (varsayılan 1). Farklı ekstra
    /// özellikli alımlar ise ayrı siparişlere bölünür.
    /// </summary>
    public int Quantity { get; set; } = 1;

    public bool Completed { get; set; }

    public bool IsDefective { get; set; }

    public bool IsPendingApproval { get; set; }

    public bool IsReproduction { get; set; }

    [MaxLength(1000)]
    public string? DefectNote { get; set; }

    // Base64 image — max ~5MB binary
    [MaxLength(7_000_000)]
    public string? DefectImage { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = string.Empty;

    public List<OrderLog> Logs { get; set; } = new();

    public DateTime CreatedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    [MaxLength(50)]
    public string SellerId { get; set; } = string.Empty;

    [MaxLength(50)]
    [JsonPropertyName("mfrId")]
    public string ManufacturerId { get; set; } = string.Empty;

    [MaxLength(100)]
    public string SellerName { get; set; } = string.Empty;

    [MaxLength(100)]
    [JsonPropertyName("mfrName")]
    public string ManufacturerName { get; set; } = string.Empty;

    public bool CancelRequested { get; set; }

    // ── Etsy kaynaklı sipariş meta verisi ────────────────────────────────────
    // Code artık ürünün SKU'sudur; Etsy kimliği bu alanlarda tutulur.
    // Duplicate önleme EtsyTransactionId, iptal eşleştirmesi EtsyReceiptId üzerinden yapılır.

    /// <summary>Etsy sipariş (receipt) numarası. Manuel siparişlerde null.</summary>
    public long? EtsyReceiptId { get; set; }

    /// <summary>Etsy işlem (transaction) numarası — satır bazında benzersiz. Manuel siparişlerde null.</summary>
    public long? EtsyTransactionId { get; set; }

    /// <summary>Müşteri adı. HASSAS: üreticiye gönderilen yanıtlarda gizlenir.</summary>
    [MaxLength(200)]
    public string? CustomerName { get; set; }

    /// <summary>Teslimat adresi. HASSAS: üreticiye gönderilen yanıtlarda gizlenir.</summary>
    [MaxLength(500)]
    public string? ShippingAddress { get; set; }

    public bool IsReadBySeller { get; set; } = true;

    public bool IsReadByMfr { get; set; } = true;
}

public class ExtraValue
{
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Type { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Value { get; set; } = string.Empty;
}
