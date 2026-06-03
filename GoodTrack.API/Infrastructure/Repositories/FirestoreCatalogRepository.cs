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

    public async Task<CatalogProduct?> GetByIdAsync(string id)
    {
        var docSnapshot = await _firestoreDb.Collection(CollectionName).Document(id).GetSnapshotAsync();
        return docSnapshot.Exists ? docSnapshot.ConvertTo<CatalogProduct>() : null;
    }

    public async Task<List<CatalogProduct>> GetCatalogBySellerAsync(string sellerId)
    {
        var query = _firestoreDb.Collection(CollectionName).WhereEqualTo("sellerId", sellerId);
        var snapshot = await query.GetSnapshotAsync();
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

    public async Task SaveAsync(CatalogProduct product)
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

        await docRef.SetAsync(product);
    }

    public async Task DeleteAsync(string id)
    {
        await _firestoreDb.Collection(CollectionName).Document(id).DeleteAsync();
    }
}
