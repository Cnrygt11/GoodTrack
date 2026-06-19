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

    [FirestoreProperty("phoneNumber")]
    public string PhoneNumber { get; set; } = string.Empty;

    [FirestoreProperty("profilePicture")]
    public string ProfilePicture { get; set; } = string.Empty;

    [FirestoreProperty("address")]
    public string Address { get; set; } = string.Empty;

    [FirestoreProperty("city")]
    public string City { get; set; } = string.Empty;

    [FirestoreProperty("bio")]
    public string Bio { get; set; } = string.Empty;

    [FirestoreProperty("productImages")]
    public List<string> ProductImages { get; set; } = new();

    [FirestoreProperty("keywords")]
    public List<string> Keywords { get; set; } = new();

    [FirestoreProperty("isVisibleToSellers")]
    public bool IsVisibleToSellers { get; set; } = false;


    [FirestoreProperty("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;

    [FirestoreProperty("associatedUserIds")]
    public List<string> AssociatedUserIds { get; set; } = new();

    [FirestoreProperty("isActive", ConverterType = typeof(GoodTrack.API.Infrastructure.Converters.FirestoreIsActiveConverter))]
    public bool IsActive { get; set; } = true;

    [FirestoreProperty("verificationToken")]
    public string VerificationToken { get; set; } = string.Empty;

    [FirestoreProperty("verificationTokenExpiresAt")]
    public string VerificationTokenExpiresAt { get; set; } = string.Empty;

    [FirestoreProperty("refreshToken")]
    public string RefreshToken { get; set; } = string.Empty;

    [FirestoreProperty("refreshTokenExpiryTime")]
    public string RefreshTokenExpiryTime { get; set; } = string.Empty;
}
