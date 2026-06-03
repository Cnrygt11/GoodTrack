using Google.Cloud.Firestore;

namespace GoodTrack.API.Models;

[FirestoreData]
public class ExtraFieldDef
{
    [FirestoreDocumentId]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    [FirestoreProperty("type")]
    public string Type { get; set; } = string.Empty;

    [FirestoreProperty("options")]
    public List<string> Options { get; set; } = new();

    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;
}
