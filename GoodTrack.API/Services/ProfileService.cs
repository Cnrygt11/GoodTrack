using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
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
    private readonly IEtsyConnectionRepository _etsyConnectionRepository;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ILogger<ProfileService> _logger;

    public ProfileService(
        IUserRepository userRepository,
        IImageStorageService imageStorageService,
        IEtsyConnectionRepository etsyConnectionRepository,
        IPasswordHasher<User> passwordHasher,
        ILogger<ProfileService> logger)
    {
        _userRepository = userRepository;
        _imageStorageService = imageStorageService;
        _etsyConnectionRepository = etsyConnectionRepository;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    public async Task DeactivateAccountAsync(string userId, string password)
    {
        var user = await _userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException(Messages.Auth.UserNotFound);

        // Güvenlik: hassas işlem, şifre onayı iste.
        if (string.IsNullOrEmpty(password) ||
            _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password) == PasswordVerificationResult.Failed)
        {
            throw new UnauthorizedAccessException(Messages.Auth.WrongPassword);
        }

        if (user.DeactivatedAt != null)
        {
            return; // zaten deaktive (idempotent)
        }

        user.DeactivatedAt = DateTime.UtcNow;
        user.RefreshToken = string.Empty; // mevcut oturum yenilenemez
        await _userRepository.SaveAsync(user);

        // Etsy senkronu dursun: bağlantıları pasifleştir (webhook reddedilir, otomatik sync durur).
        // Token/bağlantı kaydı KORUNUR; reaktivasyonda geri açılır.
        var connections = await _etsyConnectionRepository.GetAllForUserAsync(userId);
        foreach (var connection in connections)
        {
            connection.IsActive = false;
        }
        await _etsyConnectionRepository.SaveChangesAsync();

        _logger.LogInformation("User {UserId} deactivated their account (soft-delete).", userId);
    }

    public async Task<UserProfileDto> GetProfileAsync(string userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException(Messages.Auth.UserNotFound);
        }

        return MapToProfileDto(user);
    }

    public async Task<UserProfileDto> GetProfileByUsernameAsync(string username)
    {
        if (string.IsNullOrEmpty(username))
        {
            throw new ArgumentException(Messages.Auth.UsernameRequired);
        }

        var user = await _userRepository.GetByUsernameAsync(username.Trim().ToLower());
        if (user == null || user.DeactivatedAt != null)
        {
            throw new KeyNotFoundException(Messages.Auth.UserNotFound);
        }

        return MapToProfileDto(user);
    }

    public async Task UpdateProfileAsync(string userId, UserProfileDto dto)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException(Messages.Auth.UserNotFound);
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
                if (!ValidationPatterns.Email().IsMatch(emailClean))
                {
                    throw new ArgumentException(Messages.Auth.InvalidEmailFormat);
                }
                var existingUser = await _userRepository.GetByEmailAsync(emailClean);
                if (existingUser != null)
                {
                    throw new ArgumentException(Messages.Auth.EmailInUse);
                }
                user.Email = emailClean;
            }
        }

        // Phone format validation on update
        if (!string.IsNullOrWhiteSpace(dto.PhoneNumber))
        {
            if (!ValidationPatterns.Phone().IsMatch(dto.PhoneNumber.Trim()))
            {
                throw new ArgumentException("Geçersiz telefon numarası formatı!");
            }
            user.PhoneNumber = dto.PhoneNumber.Trim();
        }

        // Profile Picture (+ dizin/listelerde kullanılan küçük thumbnail)
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
                user.ProfileThumbnail = dto.ProfileThumbnail ?? string.Empty;
            }
        }
        else
        {
            if (!string.IsNullOrEmpty(user.ProfilePicture))
            {
                await _imageStorageService.DeleteImageAsync(user.ProfilePicture);
            }
            user.ProfilePicture = string.Empty;
            user.ProfileThumbnail = string.Empty;
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

    public async Task<PagedResultDto<UserProfileDto>> SearchManufacturersAsync(string? city, string? keyword, string? name, string? sort, int page, int pageSize, bool mustHaveGallery = false, bool mustHaveAvatar = false)
    {
        // Repository, galeriyi hariç tutan (yalnız GalleryCount hesaplayan) projeksiyonu + toplam sayıyı döndürür.
        var (items, totalCount) = await _userRepository.SearchManufacturersAsync(city, keyword, name, sort, page, pageSize, mustHaveGallery, mustHaveAvatar);

        return new PagedResultDto<UserProfileDto>
        {
            Items = items,
            TotalCount = totalCount,
            HasMore = (page + 1) * pageSize < totalCount,
        };
    }

    /// <summary>
    /// Görünür bir üreticinin ürün galerisini (base64 görseller) talep üzerine döner. Dizin bu
    /// üreticileri zaten listelediğinden herhangi bir kimlikli kullanıcı erişebilir; yalnız
    /// görünür (IsVisibleToSellers) ve aktif (DeactivatedAt == null) üreticiler için çalışır.
    /// </summary>
    public async Task<List<string>> GetManufacturerGalleryAsync(string manufacturerId)
    {
        var user = await _userRepository.GetByIdAsync(manufacturerId);
        if (user == null ||
            !user.Role.Equals(Roles.Mfr, StringComparison.OrdinalIgnoreCase) ||
            !user.IsVisibleToSellers ||
            user.DeactivatedAt != null)
        {
            throw new KeyNotFoundException("Üretici bulunamadı veya galerisi görüntülenemiyor.");
        }

        return user.ProductImages ?? new List<string>();
    }

    private static UserProfileDto MapToProfileDto(User user) => new()
    {
        Id = user.Id,
        Username = user.Username,
        Email = user.Email,
        PhoneNumber = user.PhoneNumber,
        FirstName = user.FirstName,
        LastName = user.LastName,
        Role = user.Role,
        ProfilePicture = user.ProfilePicture,
        ProfileThumbnail = user.ProfileThumbnail,
        Address = user.Address,
        City = user.City,
        Bio = user.Bio,
        ProductImages = user.ProductImages,
        Keywords = user.Keywords,
        IsVisibleToSellers = user.IsVisibleToSellers,
        GalleryCount = user.ProductImages?.Count ?? 0
    };
}
