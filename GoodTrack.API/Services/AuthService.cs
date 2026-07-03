using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Auth;
using GoodTrack.API.Models;
using GoodTrack.API.Constants;

namespace GoodTrack.API.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository userRepository,
        IPasswordHasher<User> passwordHasher,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            throw new ArgumentException("Kullanıcı adı ve şifre zorunludur!");
        }

        var usernameClean = request.Username.Trim().ToLower();
        var user = await _userRepository.GetByUsernameAsync(usernameClean);
        if (user == null)
        {
            throw new UnauthorizedAccessException("Geçersiz kullanıcı adı veya şifre!");
        }

        // Email Verification Check
        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("Lütfen e-posta adresinizi doğrulayın! / Please verify your email!");
        }

        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verificationResult == PasswordVerificationResult.Failed)
        {
            throw new UnauthorizedAccessException("Geçersiz kullanıcı adı veya şifre!");
        }

        var token = GenerateJwtToken(user);
        var refreshToken = GenerateRefreshToken();

        user.RefreshToken = HashToken(refreshToken);
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        await _userRepository.SaveAsync(user);

        return new LoginResponse
        {
            Token = token,
            RefreshToken = refreshToken,
            Username = user.Username,
            Role = user.Role,
            UserId = user.Id
        };
    }

    public async Task RegisterAsync(RegisterRequest request, string baseUrl)
    {
        if (request == null || 
            string.IsNullOrWhiteSpace(request.Username) || 
            string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.PhoneNumber) ||
            string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.LastName))
        {
            throw new ArgumentException("Lütfen tüm alanları doldurun!");
        }

        var usernameClean = request.Username.Trim().ToLower();
        var emailClean = request.Email.Trim().ToLower();

        // 1. Username Regex (a-z, 0-9, underscore; 3-15 chars)
        var usernameRegex = new Regex("^[a-z0-9_]{3,15}$");
        if (!usernameRegex.IsMatch(usernameClean))
        {
            throw new ArgumentException("Kullanıcı adı sadece İngilizce küçük harfler, rakamlar ve alt çizgi (_) içerebilir, 3-15 karakter uzunluğunda olmalıdır!");
        }

        // 2. Email Validation (Strict check, requiring a dot and 2-6 chars TLD, no consecutive/starting/ending dots)
        var emailRegex = new Regex(@"^[a-zA-Z0-9]+(?:[._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,6}$");
        if (!emailRegex.IsMatch(emailClean))
        {
            throw new ArgumentException("Geçersiz veya şüpheli e-posta formatı!");
        }

        // 2.5 Phone Number Validation
        var phoneClean = request.PhoneNumber.Trim();
        var phoneRegex = new Regex(@"^\+?[0-9\s\-()]{10,20}$");
        if (!phoneRegex.IsMatch(phoneClean))
        {
            throw new ArgumentException("Geçersiz telefon numarası formatı! (En az 10 karakter olmalı ve sadece rakam, boşluk, +, -, () içerebilir)");
        }

        // 3. Password Policy (8-20 chars, with complexity)
        ValidatePasswordStrength(request.Password, "Şifre");

        if (request.Password != request.ConfirmPassword)
        {
            throw new ArgumentException("Şifreler uyuşmuyor!");
        }

        if (request.Role != Roles.Seller && request.Role != Roles.Mfr && request.Role != Roles.Admin)
        {
            throw new ArgumentException("Geçersiz rol! Sadece 'seller', 'mfr' veya 'admin' olabilir.");
        }

        if (request.Role == Roles.Admin)
        {
            var adminSecret = _configuration["ADMIN_REGISTRATION_SECRET"] ?? Environment.GetEnvironmentVariable("ADMIN_REGISTRATION_SECRET");
            if (string.IsNullOrEmpty(adminSecret))
            {
                throw new ArgumentException("Yönetici kaydı şu anda sunucuda devre dışı bırakılmıştır.");
            }

            if (request.AdminSecret != adminSecret)
            {
                throw new ArgumentException("Yönetici kaydı için geçersiz güvenlik anahtarı!");
            }
        }

        // Check unique username
        var existingUserByUsername = await _userRepository.GetByUsernameAsync(usernameClean);
        if (existingUserByUsername != null)
        {
            throw new ArgumentException("Bu kullanıcı adı zaten alınmış!");
        }

        // Check unique email
        var existingUserByEmail = await _userRepository.GetByEmailAsync(emailClean);
        if (existingUserByEmail != null)
        {
            throw new ArgumentException("Bu e-posta adresi zaten kullanımda!");
        }

        var user = new User
        {
            Username = usernameClean,
            Email = emailClean,
            PhoneNumber = phoneClean,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Role = request.Role,
            CreatedAt = DateTime.UtcNow.ToString("o"),
            IsActive = true
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        await _userRepository.SaveAsync(user);
    }

    public async Task<bool> VerifyPasswordAsync(string userId, string password)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı.");
        }

        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
        return verificationResult != PasswordVerificationResult.Failed;
    }

    public async Task ChangePasswordAsync(string userId, string oldPassword, string newPassword, string confirmNewPassword)
    {
        if (string.IsNullOrWhiteSpace(oldPassword) || string.IsNullOrWhiteSpace(newPassword) || string.IsNullOrWhiteSpace(confirmNewPassword))
        {
            throw new ArgumentException("Tüm alanlar doldurulmalıdır!");
        }

        ValidatePasswordStrength(newPassword, "Yeni şifre");

        if (newPassword != confirmNewPassword)
        {
            throw new ArgumentException("Yeni şifreler uyuşmuyor!");
        }

        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı.");
        }

        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, oldPassword);
        if (verificationResult == PasswordVerificationResult.Failed)
        {
            throw new ArgumentException("Mevcut şifreniz hatalı!");
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, newPassword);
        await _userRepository.SaveAsync(user);
    }

    public async Task<LoginResponse> RefreshTokenAsync(TokenRefreshRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            throw new ArgumentException("Token ve Refresh Token zorunludur!");
        }

        ClaimsPrincipal principal;
        try
        {
            principal = GetPrincipalFromExpiredToken(request.Token);
        }
        catch (Exception ex)
        {
            throw new SecurityTokenException("Geçersiz access token / Invalid access token", ex);
        }

        var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            throw new SecurityTokenException("Token geçersiz kullanıcı kimliği içeriyor / Token contains invalid user identity");
        }

        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            throw new UnauthorizedAccessException("Kullanıcı bulunamadı / User not found");
        }

        var hashedRequestToken = HashToken(request.RefreshToken);
        if (user.RefreshToken != hashedRequestToken)
        {
            throw new UnauthorizedAccessException("Geçersiz refresh token / Invalid refresh token");
        }

        if (user.RefreshTokenExpiryTime == null || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
        {
            throw new UnauthorizedAccessException("Refresh token süresi dolmuş / Refresh token has expired");
        }

        var newAccessToken = GenerateJwtToken(user);
        var newRefreshToken = GenerateRefreshToken();

        user.RefreshToken = HashToken(newRefreshToken);
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        await _userRepository.SaveAsync(user);

        return new LoginResponse
        {
            Token = newAccessToken,
            RefreshToken = newRefreshToken,
            Username = user.Username,
            Role = user.Role,
            UserId = user.Id
        };
    }

    public async Task LogoutAsync(string userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı.");
        }

        user.RefreshToken = string.Empty;
        user.RefreshTokenExpiryTime = null;
        await _userRepository.SaveAsync(user);
    }

    private string GenerateJwtToken(User user)
    {
        var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY")
            ?? _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException(
                "JWT signing key is not configured. Set 'JWT_KEY' environment variable or 'Jwt:Key' in appsettings.json.");

        var issuer = _configuration["Jwt:Issuer"] ?? "GoodTrack.API";
        var audience = _configuration["Jwt:Audience"] ?? "GoodTrack.Client";

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(jwtKey);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role)
            }),
            Expires = DateTime.UtcNow.AddHours(3),
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private string GenerateRefreshToken()
    {
        var randomNumber = new byte[64];
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    private static string HashToken(string token)
    {
        if (string.IsNullOrEmpty(token)) return string.Empty;
        var bytes = System.Text.Encoding.UTF8.GetBytes(token);
        var hash = System.Security.Cryptography.SHA256.HashData(bytes);
        return Convert.ToHexString(hash);
    }

    private static void ValidatePasswordStrength(string password, string paramName)
    {
        if (string.IsNullOrEmpty(password))
        {
            throw new ArgumentException($"{paramName} boş olamaz!");
        }
        var passwordRegex = new Regex(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#\-_])[A-Za-z\d@$!%*?&.#\-_]{8,20}$");
        if (!passwordRegex.IsMatch(password))
        {
            throw new ArgumentException($"{paramName} en az 8, en fazla 20 karakter uzunluğunda olmalı ve en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter (@$!%*?&.#-_) içermelidir!");
        }
    }

    private ClaimsPrincipal GetPrincipalFromExpiredToken(string token)
    {
        var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY")
            ?? _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException(
                "JWT signing key is not configured. Set 'JWT_KEY' environment variable or 'Jwt:Key' in appsettings.json.");

        var issuer = _configuration["Jwt:Issuer"] ?? "GoodTrack.API";
        var audience = _configuration["Jwt:Audience"] ?? "GoodTrack.Client";

        var tokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = true,
            ValidateIssuer = true,
            ValidAudience = audience,
            ValidIssuer = issuer,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateLifetime = false // Ignore lifetime
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out var securityToken);
        
        if (securityToken is not JwtSecurityToken jwtSecurityToken || 
            !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
        {
            throw new SecurityTokenException("Geçersiz token / Invalid token");
        }

        return principal;
    }
}
