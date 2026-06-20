using Google.Cloud.Firestore;
using System.ComponentModel.DataAnnotations;

namespace GoodTrack.API.Models;

[FirestoreData]
public class Feedback
{
    [FirestoreDocumentId]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty("userId")]
    public string UserId { get; set; } = string.Empty;

    [FirestoreProperty("username")]
    public string Username { get; set; } = string.Empty;

    [FirestoreProperty("role")]
    public string Role { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [FirestoreProperty("title")]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    [FirestoreProperty("message")]
    public string Message { get; set; } = string.Empty;

    [FirestoreProperty("browserInfo")]
    public string BrowserInfo { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;
}
