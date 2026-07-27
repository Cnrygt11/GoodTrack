using System;
using System.Threading.Tasks;

namespace GoodTrack.API.Abstractions.Services;

public interface IImageStorageService
{
    /// <summary>
    /// Processes a base64 image string, saves it to persistent storage, and returns its URL.
    /// If the input is already a URL or is empty, it returns the input unchanged.
    /// </summary>
    Task<string?> StoreImageAsync(string? base64OrUrl);

    /// <summary>
    /// Deletes an image file from storage if it matches a local storage path.
    /// </summary>
    Task DeleteImageAsync(string? imageUrl);

    /// <summary>
    /// Bir görsel alanının güncellenmesini tek yerde çözer (sipariş görseli + kusur görseli
    /// akışlarının ortak üçlü dalı): yeni değer base64 ise doğrulanıp saklanır, boşsa temizlenir,
    /// URL ise olduğu gibi tutulur. Her durumda eski görsel <paramref name="cleanupOldIfUnused"/>
    /// ile (başka yerde kullanılmıyorsa) silinir. Çağıran, yeni değerin eskiden farklı olduğunu
    /// (erken çıkış) garanti eder. Dönüş: alana yazılacak yeni görsel değeri.
    /// </summary>
    Task<string?> ResolveUpdatedImageAsync(string? oldImage, string? newImage, string fieldName, Func<string?, Task> cleanupOldIfUnused);
}
