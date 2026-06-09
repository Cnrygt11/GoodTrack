using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using GoodTrack.API.Abstractions.Services;

namespace GoodTrack.API.Services;

public class Base64ImageStorageService : IImageStorageService
{
    public Base64ImageStorageService(IWebHostEnvironment env)
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

            // Enforce size limit: limit base64 string length to 2,000,000 characters (~1.5 MB binary size)
            if (base64OrUrl.Length > 2000000)
            {
                throw new ArgumentException("Görsel boyutu çok büyük! Lütfen en fazla 1.5 MB boyutunda bir görsel yükleyin.");
            }
        }

        return Task.FromResult<string?>(base64OrUrl);
    }

    public Task DeleteImageAsync(string? imageUrl)
    {
        return Task.CompletedTask;
    }
}
