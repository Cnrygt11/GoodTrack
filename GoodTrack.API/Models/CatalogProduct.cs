using System.ComponentModel.DataAnnotations;
using Google.Cloud.Firestore;

namespace GoodTrack.API.Models;

[FirestoreData]
public class CatalogProduct
{
    [FirestoreDocumentId]
    public string Id { get; set; } = string.Empty;

    [MaxLength(50)]
    [FirestoreProperty("sellerId")]
    public string SellerId { get; set; } = string.Empty;

    [MaxLength(100)]
    [FirestoreProperty("productCode")]
    public string ProductCode { get; set; } = string.Empty;

    // Base64 image — max ~5MB binary
    [MaxLength(7_000_000)]
    [FirestoreProperty("image")]
    public string Image { get; set; } = string.Empty;

    [MaxLength(50)]
    [FirestoreProperty("mfrId")]
    public string MfrId { get; set; } = string.Empty;

    [MaxLength(100)]
    [FirestoreProperty("mfrName")]
    public string MfrName { get; set; } = string.Empty;

    [MaxLength(1000)]
    [FirestoreProperty("text")]
    public string? Text { get; set; }

    [MaxLength(50)]
    [FirestoreProperty("length")]
    public string? Length { get; set; }

    [FirestoreProperty("extras")]
    public Dictionary<string, ExtraValue>? Extras { get; set; }

    [FirestoreProperty("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;
}
