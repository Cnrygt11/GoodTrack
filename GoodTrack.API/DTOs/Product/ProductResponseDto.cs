using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using GoodTrack.API.Models;

namespace GoodTrack.API.DTOs.Product;

public class ProductResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Image { get; set; }
    public string? Text { get; set; }
    public string? Length { get; set; }
    public Dictionary<string, ExtraValue>? Extras { get; set; }
    public int Quantity { get; set; } = 1;
    public bool Completed { get; set; }
    public bool IsDefective { get; set; }
    public bool IsPendingApproval { get; set; }
    public bool IsReproduction { get; set; }
    public string? DefectNote { get; set; }
    public string? DefectImage { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<OrderLog> Logs { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string SellerId { get; set; } = string.Empty;

    [JsonPropertyName("mfrId")]
    public string ManufacturerId { get; set; } = string.Empty;

    public string SellerName { get; set; } = string.Empty;

    [JsonPropertyName("mfrName")]
    public string ManufacturerName { get; set; } = string.Empty;

    public bool CancelRequested { get; set; }

    /// <summary>Etsy sipariş numarası (varsa). Manuel siparişlerde null.</summary>
    public long? EtsyReceiptId { get; set; }

    /// <summary>Müşteri adı. Üretici rolüne yapılan yanıtlarda daima null döner.</summary>
    public string? CustomerName { get; set; }

    /// <summary>Teslimat adresi. Üretici rolüne yapılan yanıtlarda daima null döner.</summary>
    public string? ShippingAddress { get; set; }

    public bool IsReadBySeller { get; set; }
    public bool IsReadByMfr { get; set; }
}
