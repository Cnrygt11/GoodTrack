using Google.Cloud.Firestore;
using GoodTrack.API.Models;
using GoodTrack.API.Abstractions.Repositories;

namespace GoodTrack.API.Infrastructure.Repositories;

public class FirestoreFeedbackRepository : IFeedbackRepository
{
    private readonly FirestoreDb _firestoreDb;
    private const string CollectionName = "feedbacks";

    public FirestoreFeedbackRepository(FirestoreDb firestoreDb)
    {
        _firestoreDb = firestoreDb;
    }

    public async Task SaveAsync(Feedback feedback, CancellationToken cancellationToken = default)
    {
        var collection = _firestoreDb.Collection(CollectionName);
        DocumentReference docRef;

        if (string.IsNullOrEmpty(feedback.Id))
        {
            docRef = collection.Document();
            feedback.Id = docRef.Id;
        }
        else
        {
            docRef = collection.Document(feedback.Id);
        }

        await docRef.SetAsync(feedback, cancellationToken: cancellationToken);
    }

    public async Task<List<Feedback>> GetAllFeedbacksAsync(CancellationToken cancellationToken = default)
    {
        var query = _firestoreDb.Collection(CollectionName).OrderByDescending("createdAt");
        var snapshot = await query.GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(doc => doc.ConvertTo<Feedback>()).ToList();
    }
}
