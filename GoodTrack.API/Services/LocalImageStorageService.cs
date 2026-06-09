using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using GoodTrack.API.Abstractions.Services;

namespace GoodTrack.API.Services;

public class LocalImageStorageService : IImageStorageService
{
    private readonly IWebHostEnvironment _env;

    public LocalImageStorageService(IWebHostEnvironment env)
    {
        _env = env;
    }

    public async Task<string?> StoreImageAsync(string? base64OrUrl)
    {
        if (string.IsNullOrEmpty(base64OrUrl))
        {
            return null;
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
            string extension;
            if (mimeType == "image/jpeg") extension = ".jpg";
            else if (mimeType == "image/png") extension = ".png";
            else if (mimeType == "image/gif") extension = ".gif";
            else if (mimeType == "image/webp") extension = ".webp";
            else
            {
                throw new ArgumentException("Desteklenmeyen görsel türü! Lütfen yalnızca JPEG, PNG, GIF veya WEBP formatında bir görsel yükleyin.");
            }

            // Enforce size limit: limit base64 string length to 2,000,000 characters (~1.5 MB binary size)
            if (base64OrUrl.Length > 2000000)
            {
                throw new ArgumentException("Görsel boyutu çok büyük! Lütfen en fazla 1.5 MB boyutunda bir görsel yükleyin.");
            }

            try
            {
                var base64Data = base64OrUrl.Substring(base64OrUrl.IndexOf("base64,") + 7);
                var imageBytes = Convert.FromBase64String(base64Data);

                var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                var uniqueFileName = $"{Guid.NewGuid()}{extension}";
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                await File.WriteAllBytesAsync(filePath, imageBytes);

                return $"/uploads/{uniqueFileName}";
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("Görsel sunucuya kaydedilirken hata oluştu: " + ex.Message, ex);
            }
        }

        return base64OrUrl;
    }

    public Task DeleteImageAsync(string? imageUrl)
    {
        if (string.IsNullOrEmpty(imageUrl) || !imageUrl.StartsWith("/uploads/"))
        {
            return Task.CompletedTask;
        }

        try
        {
            var fileName = imageUrl.Substring(9); // Strip "/uploads/"
            var filePath = Path.Combine(_env.WebRootPath, "uploads", fileName);
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }
        }
        catch
        {
            // Fail silently on deletion to prevent transactional crashes
        }

        return Task.CompletedTask;
    }
}
