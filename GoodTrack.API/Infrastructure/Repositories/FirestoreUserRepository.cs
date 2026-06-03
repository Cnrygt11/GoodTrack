using Google.Cloud.Firestore;
using GoodTrack.API.Models;
using GoodTrack.API.Abstractions.Repositories;

namespace GoodTrack.API.Infrastructure.Repositories;

public class FirestoreUserRepository : IUserRepository
{
    private readonly FirestoreDb _firestoreDb;
    private const string CollectionName = "users";

    public FirestoreUserRepository(FirestoreDb firestoreDb)
    {
        _firestoreDb = firestoreDb;
    }

    public async Task<User?> GetByIdAsync(string id)
    {
        var docSnapshot = await _firestoreDb.Collection(CollectionName).Document(id).GetSnapshotAsync();
        return docSnapshot.Exists ? docSnapshot.ConvertTo<User>() : null;
    }

    public async Task<User?> GetByUsernameAsync(string username)
    {
        var query = _firestoreDb.Collection(CollectionName).WhereEqualTo("username", username);
        var snapshot = await query.GetSnapshotAsync();
        return snapshot.Documents.Count > 0 ? snapshot.Documents[0].ConvertTo<User>() : null;
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        var query = _firestoreDb.Collection(CollectionName).WhereEqualTo("email", email);
        var snapshot = await query.GetSnapshotAsync();
        return snapshot.Documents.Count > 0 ? snapshot.Documents[0].ConvertTo<User>() : null;
    }

    public async Task<List<User>> GetManufacturersAsync()
    {
        var query = _firestoreDb.Collection(CollectionName).WhereEqualTo("role", "mfr");
        var snapshot = await query.GetSnapshotAsync();
        return snapshot.Documents.Select(doc => doc.ConvertTo<User>()).ToList();
    }

    public async Task SaveAsync(User user)
    {
        var collection = _firestoreDb.Collection(CollectionName);
        DocumentReference docRef;

        if (string.IsNullOrEmpty(user.Id))
        {
            docRef = collection.Document();
            user.Id = docRef.Id;
        }
        else
        {
            docRef = collection.Document(user.Id);
        }

        await docRef.SetAsync(user);
    }
}
