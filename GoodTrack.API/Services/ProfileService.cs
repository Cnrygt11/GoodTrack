using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Auth;
using GoodTrack.API.Models;
using GoodTrack.API.Constants;

namespace GoodTrack.API.Services;

public sealed class ProfileService : IProfileService
{
    private readonly IUserRepository _userRepository;
    private readonly IImageStorageService _imageStorageService;
    private readonly ILogger<ProfileService> _logger;

    public ProfileService(
        IUserRepository userRepository,
        IImageStorageService imageStorageService,
        ILogger<ProfileService> logger)
    {
        _userRepository = userRepository;
        _imageStorageService = imageStorageService;
        _logger = logger;
    }

    public async Task<UserProfileDto> GetProfileAsync(string userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı.");
        }

        return MapToProfileDto(user);
    }

    public async Task<UserProfileDto> GetProfileByUsernameAsync(string username)
    {
        if (string.IsNullOrEmpty(username))
        {
            throw new ArgumentException("Kullanıcı adı boş olamaz.");
        }

        var user = await _userRepository.GetByUsernameAsync(username.Trim().ToLower());
        if (user == null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı.");
        }

        return MapToProfileDto(user);
    }

    public async Task UpdateProfileAsync(string userId, UserProfileDto dto)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı.");
        }

        // Basic fields
        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;

        // Email format validation on update (same rules as registration) and check uniqueness
        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            var emailClean = dto.Email.Trim().ToLower();
            if (emailClean != user.Email)
            {
                var emailRegex = new Regex(@"^[a-zA-Z0-9]+(?:[._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,6}$");
                if (!emailRegex.IsMatch(emailClean))
                {
                    throw new ArgumentException("Geçersiz veya şüpheli e-posta formatı!");
                }
                var existingUser = await _userRepository.GetByEmailAsync(emailClean);
                if (existingUser != null)
                {
                    throw new ArgumentException("Bu e-posta adresi zaten kullanımda!");
                }
                user.Email = emailClean;
            }
        }

        // Phone format validation on update
        if (!string.IsNullOrWhiteSpace(dto.PhoneNumber))
        {
            var phoneRegex = new Regex(@"^\+?[0-9\s\-()]{10,20}$");
            if (!phoneRegex.IsMatch(dto.PhoneNumber.Trim()))
            {
                throw new ArgumentException("Geçersiz telefon numarası formatı!");
            }
            user.PhoneNumber = dto.PhoneNumber.Trim();
        }

        // Profile Picture
        if (!string.IsNullOrEmpty(dto.ProfilePicture))
        {
            if (dto.ProfilePicture != user.ProfilePicture)
            {
                // Delete old profile picture if any
                if (!string.IsNullOrEmpty(user.ProfilePicture))
                {
                    await _imageStorageService.DeleteImageAsync(user.ProfilePicture);
                }
                user.ProfilePicture = await _imageStorageService.StoreImageAsync(dto.ProfilePicture) ?? string.Empty;
            }
        }
        else
        {
            if (!string.IsNullOrEmpty(user.ProfilePicture))
            {
                await _imageStorageService.DeleteImageAsync(user.ProfilePicture);
            }
            user.ProfilePicture = string.Empty;
        }

        // Manufacturer Specific fields
        if (user.Role == Roles.Mfr)
        {
            // Bio limit validation (500 characters)
            if (dto.Bio != null && dto.Bio.Length > 500)
            {
                throw new ArgumentException("Tanıtım metni en fazla 500 karakter olmalıdır!");
            }
            user.Bio = dto.Bio ?? string.Empty;
            user.Address = dto.Address ?? string.Empty;
            user.City = dto.City?.Trim().ToLower() ?? string.Empty;
            user.IsVisibleToSellers = dto.IsVisibleToSellers;

            // Keywords selection (up to 3 keywords)
            if (dto.Keywords != null && dto.Keywords.Count > 3)
            {
                throw new ArgumentException("En fazla 3 kategori/anahtar kelime seçebilirsiniz!");
            }
            user.Keywords = dto.Keywords?.Select(k => k.Trim().ToLower()).ToList() ?? new List<string>();

            // Product showcase image count checks (3 to 10 images)
            int imgCount = dto.ProductImages?.Count ?? 0;
            if (imgCount > 0 && (imgCount < 3 || imgCount > 10))
            {
                throw new ArgumentException("Ürün tanıtımı için en az 3, en fazla 10 görsel yüklemelisiniz!");
            }
            if (dto.IsVisibleToSellers && imgCount < 3)
            {
                throw new ArgumentException("Mağazanızı satıcılara göstermek için en az 3 ürün görseli yüklemelisiniz!");
            }

            // Process product images using _imageStorageService.StoreImageAsync in parallel
            var processedImages = new List<string>();
            if (dto.ProductImages != null)
            {
                var tasks = dto.ProductImages.Select(img => _imageStorageService.StoreImageAsync(img));
                var results = await Task.WhenAll(tasks);
                foreach (var url in results)
                {
                    if (!string.IsNullOrEmpty(url))
                    {
                        processedImages.Add(url);
                    }
                }
            }

            // Clean up deleted images
            if (user.ProductImages != null)
            {
                foreach (var oldImg in user.ProductImages)
                {
                    if (!processedImages.Contains(oldImg))
                    {
                        await _imageStorageService.DeleteImageAsync(oldImg);
                    }
                }
            }
            user.ProductImages = processedImages;
        }

        await _userRepository.SaveAsync(user);
    }

    public async Task<PagedResultDto<UserProfileDto>> SearchManufacturersAsync(string? city, string? keyword, string? cursor, int limit, bool mustHaveGallery = false, bool mustHaveAvatar = false)
    {
        var (users, nextCursor) = await _userRepository.SearchManufacturersAsync(city, keyword, cursor, limit, mustHaveGallery, mustHaveAvatar);
        
        var items = users.Select(MapToProfileDto).ToList();

        return new PagedResultDto<UserProfileDto>
        {
            Items = items,
            NextCursor = nextCursor
        };
    }

    private static UserProfileDto MapToProfileDto(User user) => new()
    {
        Username = user.Username,
        Email = user.Email,
        PhoneNumber = user.PhoneNumber,
        FirstName = user.FirstName,
        LastName = user.LastName,
        Role = user.Role,
        ProfilePicture = user.ProfilePicture,
        Address = user.Address,
        City = user.City,
        Bio = user.Bio,
        ProductImages = user.ProductImages,
        Keywords = user.Keywords,
        IsVisibleToSellers = user.IsVisibleToSellers
    };
}
