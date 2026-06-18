using System.ComponentModel.DataAnnotations;
using Google.Cloud.Firestore;

namespace GoodTrack.API.Models;

[FirestoreData]
public class ExtraFieldDef
{
    [FirestoreDocumentId]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    [FirestoreProperty("type")]
    public string Type { get; set; } = string.Empty;

    [FirestoreProperty("options")]
    public List<string> Options { get; set; } = new();

    [MaxLength(50)]
    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;
}
