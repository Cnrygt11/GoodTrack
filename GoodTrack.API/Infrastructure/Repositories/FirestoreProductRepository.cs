using Google.Cloud.Firestore;
using GoodTrack.API.Models;
using GoodTrack.API.Abstractions.Repositories;

namespace GoodTrack.API.Infrastructure.Repositories;

public class FirestoreProductRepository : IProductRepository
{
    private readonly FirestoreDb _firestoreDb;
    private const string CollectionName = "products";

    public FirestoreProductRepository(FirestoreDb firestoreDb)
    {
        _firestoreDb = firestoreDb;
    }

    public async Task<Product?> GetByIdAsync(string id)
    {
        var docSnapshot = await _firestoreDb.Collection(CollectionName).Document(id).GetSnapshotAsync();
        return docSnapshot.Exists ? docSnapshot.ConvertTo<Product>() : null;
    }

    public async Task<List<Product>> GetProductsBySellerAsync(string sellerId)
    {
        var query = _firestoreDb.Collection(CollectionName).WhereEqualTo("sellerId", sellerId);
        var snapshot = await query.GetSnapshotAsync();
        return snapshot.Documents.Select(doc => doc.ConvertTo<Product>()).ToList();
    }

    public async Task<List<Product>> GetProductsByManufacturerAsync(string mfrId)
    {
        var query = _firestoreDb.Collection(CollectionName).WhereEqualTo("mfrId", mfrId);
        var snapshot = await query.GetSnapshotAsync();
        return snapshot.Documents.Select(doc => doc.ConvertTo<Product>()).ToList();
    }

    public async Task SaveAsync(Product product)
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
        var docRef = _firestoreDb.Collection(CollectionName).Document(id);
        await docRef.DeleteAsync();
    }
}
