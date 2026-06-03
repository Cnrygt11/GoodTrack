using Google.Cloud.Firestore;
using GoodTrack.API.Models;
using GoodTrack.API.Abstractions.Repositories;

namespace GoodTrack.API.Infrastructure.Repositories;

public class FirestoreConnectionRequestRepository : IConnectionRequestRepository
{
    private readonly FirestoreDb _firestoreDb;
    private const string CollectionName = "connection_requests";

    public FirestoreConnectionRequestRepository(FirestoreDb firestoreDb)
    {
        _firestoreDb = firestoreDb;
    }

    public async Task<ConnectionRequest?> GetByIdAsync(string id)
    {
        var docSnapshot = await _firestoreDb.Collection(CollectionName).Document(id).GetSnapshotAsync();
        return docSnapshot.Exists ? docSnapshot.ConvertTo<ConnectionRequest>() : null;
    }

    public async Task<List<ConnectionRequest>> GetIncomingPendingRequestsAsync(string receiverId)
    {
        var query = _firestoreDb.Collection(CollectionName)
            .WhereEqualTo("receiverId", receiverId)
            .WhereEqualTo("status", "pending");
        var snapshot = await query.GetSnapshotAsync();
        return snapshot.Documents.Select(doc => doc.ConvertTo<ConnectionRequest>()).ToList();
    }

    public async Task<bool> HasPendingRequestAsync(string senderId, string receiverId)
    {
        var query = _firestoreDb.Collection(CollectionName)
            .WhereEqualTo("senderId", senderId)
            .WhereEqualTo("receiverId", receiverId)
            .WhereEqualTo("status", "pending");
        var snapshot = await query.GetSnapshotAsync();
        return snapshot.Documents.Count > 0;
    }

    public async Task<List<ConnectionRequest>> GetSentRequestsAsync(string senderId)
    {
        var query = _firestoreDb.Collection(CollectionName)
            .WhereEqualTo("senderId", senderId);
        var snapshot = await query.GetSnapshotAsync();
        return snapshot.Documents.Select(doc => doc.ConvertTo<ConnectionRequest>()).ToList();
    }

    public async Task SaveAsync(ConnectionRequest request)
    {
        var collection = _firestoreDb.Collection(CollectionName);
        DocumentReference docRef;

        if (string.IsNullOrEmpty(request.Id))
        {
            docRef = collection.Document();
            request.Id = docRef.Id;
        }
        else
        {
            docRef = collection.Document(request.Id);
        }

        await docRef.SetAsync(request);
    }

    public async Task DeleteAsync(string id)
    {
        await _firestoreDb.Collection(CollectionName).Document(id).DeleteAsync();
    }
}
