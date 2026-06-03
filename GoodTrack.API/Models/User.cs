using Google.Cloud.Firestore;

namespace GoodTrack.API.Models;

[FirestoreData]
public class User
{
    [FirestoreDocumentId]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty("username")]
    public string Username { get; set; } = string.Empty;

    [FirestoreProperty("passwordHash")]
    public string PasswordHash { get; set; } = string.Empty;

    [FirestoreProperty("role")]
    public string Role { get; set; } = string.Empty; // "seller" or "mfr"

    [FirestoreProperty("firstName")]
    public string FirstName { get; set; } = string.Empty;

    [FirestoreProperty("lastName")]
    public string LastName { get; set; } = string.Empty;

    [FirestoreProperty("email")]
    public string Email { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;

    [FirestoreProperty("associatedUserIds")]
    public List<string> AssociatedUserIds { get; set; } = new();
}
