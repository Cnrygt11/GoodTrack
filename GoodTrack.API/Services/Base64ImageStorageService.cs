using GoodTrack.API.Constants;
using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using GoodTrack.API.Abstractions.Services;

namespace GoodTrack.API.Services;

public sealed class Base64ImageStorageService : IImageStorageService
{
    public Base64ImageStorageService()
    {
    }

    public Task<string?> StoreImageAsync(string? base64OrUrl)
    {
        if (string.IsNullOrEmpty(base64OrUrl))
        {
            return Task.FromResult<string?>(null);
        }

        if (base64OrUrl.StartsWith("data:image"))
        {
            // Validate MIME type strictly using Regex
            var match = Regex.Match(base64OrUrl, @"^data:(image/[a-zA-Z+-]+);base64,");
            if (!match.Success)
            {
                throw new ArgumentException("Geçersiz görsel formatı! Yalnızca JPEG, PNG, GIF veya WEBP formatındaki base64 verileri kabul edilir.");
            }

            var mimeType = match.Groups[1].Value.ToLower();
            if (mimeType != "image/jpeg" && mimeType != "image/png" && mimeType != "image/gif" && mimeType != "image/webp")
            {
                throw new ArgumentException("Desteklenmeyen görsel türü! Lütfen yalnızca JPEG, PNG, GIF veya WEBP formatında bir görsel yükleyin.");
            }

            // Enforce size limit (~5 MB binary size)
            if (base64OrUrl.Length > ImageLimits.MaxBase64Length)
            {
                throw new ArgumentException("Görsel boyutu çok büyük! Lütfen en fazla 5 MB boyutunda bir görsel yükleyin.");
            }
        }

        return Task.FromResult<string?>(base64OrUrl);
    }

    public Task DeleteImageAsync(string? imageUrl)
    {
        return Task.CompletedTask;
    }

    public async Task<string?> ResolveUpdatedImageAsync(string? oldImage, string? newImage, string fieldName, Func<string?, Task> cleanupOldIfUnused)
    {
        // Yeni base64 görsel: boyut doğrulanır, saklanır; eski temizlenir.
        if (!string.IsNullOrEmpty(newImage) && newImage.StartsWith("data:image"))
        {
            ImageLimits.ValidateImageSize(newImage, fieldName);
            var stored = await StoreImageAsync(newImage);
            await cleanupOldIfUnused(oldImage);
            return stored;
        }

        // Görsel kaldırıldı: alan null'lanır; eski temizlenir.
        if (string.IsNullOrEmpty(newImage))
        {
            await cleanupOldIfUnused(oldImage);
            return null;
        }

        // Yeni değer URL (örn. Etsy CDN): olduğu gibi tutulur; eski temizlenir.
        await cleanupOldIfUnused(oldImage);
        return newImage;
    }
}
