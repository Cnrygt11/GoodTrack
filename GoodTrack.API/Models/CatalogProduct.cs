using Google.Cloud.Firestore;

namespace GoodTrack.API.Models;

[FirestoreData]
public class CatalogProduct
{
    [FirestoreDocumentId]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty("sellerId")]
    public string SellerId { get; set; } = string.Empty;

    [FirestoreProperty("productCode")]
    public string ProductCode { get; set; } = string.Empty;

    [FirestoreProperty("image")]
    public string Image { get; set; } = string.Empty; // Base64 data URL

    [FirestoreProperty("mfrId")]
    public string MfrId { get; set; } = string.Empty;

    [FirestoreProperty("mfrName")]
    public string MfrName { get; set; } = string.Empty;

    [FirestoreProperty("text")]
    public string? Text { get; set; }

    [FirestoreProperty("length")]
    public string? Length { get; set; }

    [FirestoreProperty("extras")]
    public Dictionary<string, ExtraValue>? Extras { get; set; }

    [FirestoreProperty("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;
}
