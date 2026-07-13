using System;
using System.Collections.Generic;

namespace GoodTrack.API.Models;

public class User
{
    public string Id { get; set; } = string.Empty;

    public string Username { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty; // "seller" or "mfr"

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string ProfilePicture { get; set; } = string.Empty;

    /// <summary>Dizin/listelerde gösterilen küçük avatar thumbnail'i (~160px). Tam avatar profil detayında.</summary>
    public string ProfileThumbnail { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public string City { get; set; } = string.Empty;

    public string Bio { get; set; } = string.Empty;

    public List<string> ProductImages { get; set; } = new();

    public List<string> Keywords { get; set; } = new();

    public bool IsVisibleToSellers { get; set; } = false;

    public string CreatedAt { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Soft-delete (deaktivasyon) zaman damgası. Null = aktif hesap.
    /// Değer varsa hesap kullanıcı tarafından deaktive edilmiştir; giriş yapılamaz,
    /// aramada görünmez. Doğru şifreyle girişte otomatik reaktive olur (DeactivatedAt = null).
    /// Not: E-posta doğrulaması <see cref="IsActive"/> ile yönetilir; deaktivasyondan ayrıdır.
    /// </summary>
    public DateTime? DeactivatedAt { get; set; }

    public string VerificationToken { get; set; } = string.Empty;

    public string VerificationTokenExpiresAt { get; set; } = string.Empty;

    public string RefreshToken { get; set; } = string.Empty;

    public DateTime? RefreshTokenExpiryTime { get; set; }

    public uint RowVersion { get; set; }
}
