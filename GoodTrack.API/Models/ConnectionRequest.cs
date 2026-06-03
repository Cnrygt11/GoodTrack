using Google.Cloud.Firestore;

namespace GoodTrack.API.Models;

[FirestoreData]
public class ConnectionRequest
{
    [FirestoreDocumentId]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty("senderId")]
    public string SenderId { get; set; } = string.Empty;

    [FirestoreProperty("senderUsername")]
    public string SenderUsername { get; set; } = string.Empty;

    [FirestoreProperty("receiverId")]
    public string ReceiverId { get; set; } = string.Empty;

    [FirestoreProperty("receiverUsername")]
    public string ReceiverUsername { get; set; } = string.Empty;

    [FirestoreProperty("status")]
    public string Status { get; set; } = "pending"; // "pending", "accepted", "rejected"

    [FirestoreProperty("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;
}
