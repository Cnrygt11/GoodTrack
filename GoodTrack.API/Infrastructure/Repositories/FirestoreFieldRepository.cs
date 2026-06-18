using System.Threading;
using Google.Cloud.Firestore;
using GoodTrack.API.Models;
using GoodTrack.API.Abstractions.Repositories;

namespace GoodTrack.API.Infrastructure.Repositories;

public class FirestoreFieldRepository : IFieldRepository
{
    private readonly FirestoreDb _firestoreDb;
    private const string CollectionName = "extraFieldDefs";

    public FirestoreFieldRepository(FirestoreDb firestoreDb)
    {
        _firestoreDb = firestoreDb;
    }

    public async Task<ExtraFieldDef?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        var docSnapshot = await _firestoreDb.Collection(CollectionName).Document(id).GetSnapshotAsync(cancellationToken);
        return docSnapshot.Exists ? docSnapshot.ConvertTo<ExtraFieldDef>() : null;
    }

    public async Task<List<ExtraFieldDef>> GetFieldsBySellerAsync(string sellerId, CancellationToken cancellationToken = default)
    {
        var query = _firestoreDb.Collection(CollectionName).WhereEqualTo("createdBy", sellerId);
        var snapshot = await query.GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(doc => doc.ConvertTo<ExtraFieldDef>()).ToList();
    }

    public async Task SaveAsync(ExtraFieldDef field, CancellationToken cancellationToken = default)
    {
        var collection = _firestoreDb.Collection(CollectionName);
        DocumentReference docRef;

        if (string.IsNullOrEmpty(field.Id))
        {
            docRef = collection.Document();
            field.Id = docRef.Id;
        }
        else
        {
            docRef = collection.Document(field.Id);
        }

        await docRef.SetAsync(field, cancellationToken: cancellationToken);
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        await _firestoreDb.Collection(CollectionName).Document(id).DeleteAsync(cancellationToken: cancellationToken);
    }
}
