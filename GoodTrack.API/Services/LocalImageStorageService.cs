using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using GoodTrack.API.Abstractions.Services;

namespace GoodTrack.API.Services;

public class LocalImageStorageService : IImageStorageService
{
    public LocalImageStorageService(IWebHostEnvironment env)
    {
    }

    public Task<string?> StoreImageAsync(string? base64OrUrl)
    {
        return Task.FromResult(base64OrUrl);
    }

    public Task DeleteImageAsync(string? imageUrl)
    {
        return Task.CompletedTask;
    }
}
