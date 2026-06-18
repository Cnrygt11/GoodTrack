using System.Threading;
using Google.Cloud.Firestore;
using GoodTrack.API.Models;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Constants;

namespace GoodTrack.API.Infrastructure.Repositories;

public class FirestoreUserRepository : IUserRepository
{
    private readonly FirestoreDb _firestoreDb;
    private const string CollectionName = "users";

    public FirestoreUserRepository(FirestoreDb firestoreDb)
    {
        _firestoreDb = firestoreDb;
    }

    public async Task<User?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        var docSnapshot = await _firestoreDb.Collection(CollectionName).Document(id).GetSnapshotAsync(cancellationToken);
        return docSnapshot.Exists ? docSnapshot.ConvertTo<User>() : null;
    }

    public async Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        var query = _firestoreDb.Collection(CollectionName).WhereEqualTo("username", username);
        var snapshot = await query.GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Count > 0 ? snapshot.Documents[0].ConvertTo<User>() : null;
    }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var query = _firestoreDb.Collection(CollectionName).WhereEqualTo("email", email);
        var snapshot = await query.GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Count > 0 ? snapshot.Documents[0].ConvertTo<User>() : null;
    }

    public async Task<List<User>> GetManufacturersAsync(CancellationToken cancellationToken = default)
    {
        var query = _firestoreDb.Collection(CollectionName).WhereEqualTo("role", Roles.Mfr);
        var snapshot = await query.GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(doc => doc.ConvertTo<User>()).ToList();
    }

    public async Task SaveAsync(User user, CancellationToken cancellationToken = default)
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

        await docRef.SetAsync(user, cancellationToken: cancellationToken);
    }

    public async Task<(List<User> Items, string? NextCursor)> SearchManufacturersAsync(string? city, string? keyword, string? cursor, int limit, CancellationToken cancellationToken = default)
    {
        var collection = _firestoreDb.Collection(CollectionName);
        Query query = collection
            .WhereEqualTo("role", Roles.Mfr)
            .WhereEqualTo("isVisibleToSellers", true);

        if (!string.IsNullOrEmpty(city))
        {
            query = query.WhereEqualTo("city", city.Trim());
        }

        if (!string.IsNullOrEmpty(keyword))
        {
            query = query.WhereArrayContains("keywords", keyword.Trim());
        }

        // Order by document ID for stable cursor startAfter queries
        query = query.OrderBy(FieldPath.DocumentId);

        if (!string.IsNullOrEmpty(cursor))
        {
            var startAfterDoc = await collection.Document(cursor).GetSnapshotAsync(cancellationToken);
            if (startAfterDoc.Exists)
            {
                query = query.StartAfter(startAfterDoc);
            }
        }

        // Fetch limit + 1 items to see if there is a next page
        query = query.Limit(limit + 1);

        var snapshot = await query.GetSnapshotAsync(cancellationToken);
        var documents = snapshot.Documents;

        bool hasNextPage = documents.Count > limit;
        var items = documents
            .Take(limit)
            .Select(doc => doc.ConvertTo<User>())
            .ToList();

        string? nextCursor = null;
        if (hasNextPage && items.Count > 0)
        {
            nextCursor = items.Last().Id;
        }

        return (items, nextCursor);
    }
}
