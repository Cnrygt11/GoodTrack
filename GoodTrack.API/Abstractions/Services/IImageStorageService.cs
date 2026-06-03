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
}
