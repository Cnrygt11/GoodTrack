using Google.Cloud.Firestore;

namespace GoodTrack.API.Models;

[FirestoreData]
public class OrderLog
{
    [FirestoreProperty("timestamp")]
    public string Timestamp { get; set; } = string.Empty;

    [FirestoreProperty("status")]
    public string Status { get; set; } = string.Empty;

    [FirestoreProperty("message")]
    public string Message { get; set; } = string.Empty;

    [FirestoreProperty("userId")]
    public string UserId { get; set; } = string.Empty;

    [FirestoreProperty("userName")]
    public string UserName { get; set; } = string.Empty;
}
