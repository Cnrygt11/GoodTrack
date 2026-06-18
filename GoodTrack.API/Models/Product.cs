using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Google.Cloud.Firestore;

namespace GoodTrack.API.Models;

[FirestoreData]
public class Product
{
    [FirestoreDocumentId]
    public string Id { get; set; } = string.Empty;

    [MaxLength(100)]
    [FirestoreProperty("code")]
    public string Code { get; set; } = string.Empty;

    // Base64 image — max ~5MB binary
    [MaxLength(7_000_000)]
    [FirestoreProperty("image")]
    public string? Image { get; set; }

    [MaxLength(1000)]
    [FirestoreProperty("text")]
    public string? Text { get; set; }

    [MaxLength(50)]
    [FirestoreProperty("length")]
    public string? Length { get; set; }

    [FirestoreProperty("extras")]
    public Dictionary<string, ExtraValue>? Extras { get; set; }

    [FirestoreProperty("completed")]
    public bool Completed { get; set; }

    [FirestoreProperty("isDefective")]
    public bool IsDefective { get; set; }

    [FirestoreProperty("isPendingApproval")]
    public bool IsPendingApproval { get; set; }

    [FirestoreProperty("isReproduction")]
    public bool IsReproduction { get; set; }

    [MaxLength(1000)]
    [FirestoreProperty("defectNote")]
    public string? DefectNote { get; set; }

    // Base64 image — max ~5MB binary
    [MaxLength(7_000_000)]
    [FirestoreProperty("defectImage")]
    public string? DefectImage { get; set; }

    [MaxLength(50)]
    [FirestoreProperty("status")]
    public string Status { get; set; } = string.Empty;

    [FirestoreProperty("logs")]
    public List<OrderLog> Logs { get; set; } = new();

    [FirestoreProperty("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;

    [FirestoreProperty("completedAt")]
    public string? CompletedAt { get; set; }

    [MaxLength(50)]
    [FirestoreProperty("sellerId")]
    public string SellerId { get; set; } = string.Empty;

    [MaxLength(50)]
    [FirestoreProperty("mfrId")]
    [JsonPropertyName("mfrId")]
    public string ManufacturerId { get; set; } = string.Empty;

    [MaxLength(100)]
    [FirestoreProperty("sellerName")]
    public string SellerName { get; set; } = string.Empty;

    [MaxLength(100)]
    [FirestoreProperty("mfrName")]
    [JsonPropertyName("mfrName")]
    public string ManufacturerName { get; set; } = string.Empty;

    [FirestoreProperty("cancelRequested")]
    public bool CancelRequested { get; set; }
}

[FirestoreData]
public class ExtraValue
{
    [MaxLength(100)]
    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    [FirestoreProperty("type")]
    public string Type { get; set; } = string.Empty;

    [MaxLength(500)]
    [FirestoreProperty("value")]
    public string Value { get; set; } = string.Empty;
}
