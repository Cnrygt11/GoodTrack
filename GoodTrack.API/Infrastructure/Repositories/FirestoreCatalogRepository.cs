using System.Threading;
using Google.Cloud.Firestore;
using GoodTrack.API.Models;
using GoodTrack.API.Abstractions.Repositories;

namespace GoodTrack.API.Infrastructure.Repositories;

public class FirestoreCatalogRepository : ICatalogRepository
{
    private readonly FirestoreDb _firestoreDb;
    private const string CollectionName = "catalog_products";

    public FirestoreCatalogRepository(FirestoreDb firestoreDb)
    {
        _firestoreDb = firestoreDb;
    }

    public async Task<CatalogProduct?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        var docSnapshot = await _firestoreDb.Collection(CollectionName).Document(id).GetSnapshotAsync(cancellationToken);
        return docSnapshot.Exists ? docSnapshot.ConvertTo<CatalogProduct>() : null;
    }

    public async Task<List<CatalogProduct>> GetCatalogBySellerAsync(string sellerId, CancellationToken cancellationToken = default)
    {
        var query = _firestoreDb.Collection(CollectionName).WhereEqualTo("sellerId", sellerId);
        var snapshot = await query.GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(doc => doc.ConvertTo<CatalogProduct>()).ToList();
    }

    public async Task<bool> HasProductCodeAsync(string sellerId, string code)
    {
        var query = _firestoreDb.Collection(CollectionName)
            .WhereEqualTo("sellerId", sellerId)
            .WhereEqualTo("productCode", code);
        var snapshot = await query.GetSnapshotAsync();
        return snapshot.Documents.Count > 0;
    }

    public async Task SaveAsync(CatalogProduct product, CancellationToken cancellationToken = default)
    {
        var collection = _firestoreDb.Collection(CollectionName);
        DocumentReference docRef;

        if (string.IsNullOrEmpty(product.Id))
        {
            docRef = collection.Document();
            product.Id = docRef.Id;
        }
        else
        {
            docRef = collection.Document(product.Id);
        }

        await docRef.SetAsync(product, cancellationToken: cancellationToken);
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        await _firestoreDb.Collection(CollectionName).Document(id).DeleteAsync(cancellationToken: cancellationToken);
    }
}
