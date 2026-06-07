using Google.Cloud.Firestore;

namespace GoodTrack.API.Models;

[FirestoreData]
public class Product
{
    [FirestoreDocumentId]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty("code")]
    public string Code { get; set; } = string.Empty;

    [FirestoreProperty("image")]
    public string? Image { get; set; }

    [FirestoreProperty("text")]
    public string? Text { get; set; }

    [FirestoreProperty("length")]
    public string? Length { get; set; }

    [FirestoreProperty("extras")]
    public Dictionary<string, ExtraValue>? Extras { get; set; }

    [FirestoreProperty("completed")]
    public bool Completed { get; set; }

    [FirestoreProperty("isDefective")]
    public bool IsDefective { get; set; }


    [FirestoreProperty("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;

    [FirestoreProperty("sellerId")]
    public string SellerId { get; set; } = string.Empty;

    [FirestoreProperty("mfrId")]
    public string MfrId { get; set; } = string.Empty;

    [FirestoreProperty("sellerName")]
    public string SellerName { get; set; } = string.Empty;

    [FirestoreProperty("mfrName")]
    public string MfrName { get; set; } = string.Empty;
}

[FirestoreData]
public class ExtraValue
{
    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    [FirestoreProperty("type")]
    public string Type { get; set; } = string.Empty;

    [FirestoreProperty("value")]
    public string Value { get; set; } = string.Empty;
}
