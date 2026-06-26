using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Auth;
using GoodTrack.API.Models;
using GoodTrack.API.Hubs;
using GoodTrack.API.Constants;

namespace GoodTrack.API.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IConnectionRequestRepository _connectionRequestRepository;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IConfiguration _configuration;
    private readonly IHubContext<TrackingHub> _hubContext;
    private readonly ILogger<AuthService> _logger;
    private readonly IImageStorageService _imageStorageService;

    public AuthService(
        IUserRepository userRepository,
        IConnectionRequestRepository connectionRequestRepository,
        IPasswordHasher<User> passwordHasher,
        IConfiguration configuration,
        IHubContext<TrackingHub> hubContext,
        ILogger<AuthService> logger,
        IImageStorageService imageStorageService)
    {
        _userRepository = userRepository;
        _connectionRequestRepository = connectionRequestRepository;
        _passwordHasher = passwordHasher;
        _configuration = configuration;
        _hubContext = hubContext;
        _logger = logger;
        _imageStorageService = imageStorageService;
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

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7).ToString("o");
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

        // 3. Password Length (6-20 chars)
        if (request.Password.Length < 6 || request.Password.Length > 20)
        {
            throw new ArgumentException("Şifre en az 6, en fazla 20 karakter uzunluğunda olmalıdır!");
        }

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

    public async Task<List<UserDto>> GetConnectionsAsync(string userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı.");
        }

        if (user.AssociatedUserIds == null || user.AssociatedUserIds.Count == 0)
        {
            return new List<UserDto>();
        }

        var fetchTasks = user.AssociatedUserIds
            .Select(id => _userRepository.GetByIdAsync(id))
            .ToList();

        var targets = await Task.WhenAll(fetchTasks);

        return targets
            .Where(t => t != null)
            .Select(t => new UserDto { Id = t!.Id, Username = t.Username, Role = t.Role })
            .ToList();
    }

    public async Task RemoveConnectionAsync(string userId, string targetId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        var target = await _userRepository.GetByIdAsync(targetId);

        if (user == null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı.");
        }

        if (user.AssociatedUserIds != null && user.AssociatedUserIds.Contains(targetId))
        {
            user.AssociatedUserIds.Remove(targetId);
            await _userRepository.SaveAsync(user);
        }

        if (target != null && target.AssociatedUserIds != null && target.AssociatedUserIds.Contains(userId))
        {
            target.AssociatedUserIds.Remove(userId);
            await _userRepository.SaveAsync(target);
        }

        // Real-time notification: connection removed
        await _hubContext.Clients.Users(userId, targetId).SendAsync("ReceiveConnectionUpdate");
    }

    public async Task<List<UserDto>> GetAvailableManufacturersAsync()
    {
        var mfrs = await _userRepository.GetManufacturersAsync();
        return mfrs.Select(u => new UserDto { Id = u.Id, Username = u.Username, Role = u.Role }).ToList();
    }

    public async Task SendConnectionRequestAsync(string senderId, string senderUsername, string senderRole, string targetUsername)
    {
        var receiver = await _userRepository.GetByUsernameAsync(targetUsername);
        if (receiver == null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı!");
        }

        if (receiver.Id == senderId)
        {
            throw new ArgumentException("Kendinize bağlantı isteği gönderemezsiniz.");
        }

        if (receiver.Role == senderRole)
        {
            var oppositeRoleText = (senderRole == Roles.Seller) ? "üretici" : "satıcı";
            throw new ArgumentException($"Sadece {oppositeRoleText} ekleyebilirsiniz.");
        }

        if (receiver.AssociatedUserIds != null && receiver.AssociatedUserIds.Contains(senderId))
        {
            throw new ArgumentException("Bu kullanıcı zaten listenizde ekli.");
        }

        var isPendingFromSender = await _connectionRequestRepository.HasPendingRequestAsync(senderId, receiver.Id);
        if (isPendingFromSender)
        {
            throw new ArgumentException("Bu kullanıcıya zaten beklemede olan bir bağlantı isteği gönderdiniz.");
        }

        var isPendingFromReceiver = await _connectionRequestRepository.HasPendingRequestAsync(receiver.Id, senderId);
        if (isPendingFromReceiver)
        {
            throw new ArgumentException("Bu kullanıcıdan size zaten gelen bir bağlantı isteği var. Lütfen gelen istekler bölümünden kabul edin.");
        }

        var connectionRequest = new ConnectionRequest
        {
            SenderId = senderId,
            SenderUsername = senderUsername,
            ReceiverId = receiver.Id,
            ReceiverUsername = receiver.Username,
            Status = "pending",
            CreatedAt = DateTime.UtcNow.ToString("o")
        };

        await _connectionRequestRepository.SaveAsync(connectionRequest);

        // Real-time notification: connection request sent
        await _hubContext.Clients.User(receiver.Id).SendAsync("ReceiveConnectionRequest");
        await _hubContext.Clients.User(senderId).SendAsync("ReceiveConnectionRequest");
    }

    public async Task<List<ConnectionRequestDto>> GetIncomingRequestsAsync(string receiverId)
    {
        var requests = await _connectionRequestRepository.GetIncomingPendingRequestsAsync(receiverId);
        return requests.Select(MapToConnectionRequestDto).ToList();
    }

    public async Task<List<ConnectionRequestDto>> GetSentRequestsAsync(string senderId)
    {
        var requests = await _connectionRequestRepository.GetSentRequestsAsync(senderId);
        return requests.Select(MapToConnectionRequestDto).ToList();
    }

    public async Task AcceptConnectionRequestAsync(string receiverId, string requestId)
    {
        var request = await _connectionRequestRepository.GetByIdAsync(requestId);
        if (request == null)
        {
            throw new KeyNotFoundException("Bağlantı isteği bulunamadı.");
        }

        if (request.ReceiverId != receiverId)
        {
            throw new UnauthorizedAccessException("Bu isteği kabul etme yetkiniz yok.");
        }

        if (request.Status != "pending")
        {
            throw new ArgumentException("İstek zaten işlenmiş.");
        }

        var user = await _userRepository.GetByIdAsync(receiverId);
        var sender = await _userRepository.GetByIdAsync(request.SenderId);

        if (user == null || sender == null)
        {
            throw new KeyNotFoundException("Kullanıcılardan biri bulunamadı.");
        }

        user.AssociatedUserIds ??= new List<string>();
        sender.AssociatedUserIds ??= new List<string>();

        if (!user.AssociatedUserIds.Contains(sender.Id))
        {
            user.AssociatedUserIds.Add(sender.Id);
        }
        if (!sender.AssociatedUserIds.Contains(user.Id))
        {
            sender.AssociatedUserIds.Add(user.Id);
        }

        await _userRepository.SaveAsync(user);
        await _userRepository.SaveAsync(sender);

        request.Status = "accepted";
        await _connectionRequestRepository.SaveAsync(request);

        // Real-time notification: connection request accepted (update both connections list and requests list)
        await _hubContext.Clients.Users(receiverId, request.SenderId).SendAsync("ReceiveConnectionUpdate");
        await _hubContext.Clients.Users(receiverId, request.SenderId).SendAsync("ReceiveConnectionRequest");
    }

    public async Task RejectConnectionRequestAsync(string receiverId, string requestId)
    {
        var request = await _connectionRequestRepository.GetByIdAsync(requestId);
        if (request == null)
        {
            throw new KeyNotFoundException("Bağlantı isteği bulunamadı.");
        }

        if (request.ReceiverId != receiverId)
        {
            throw new UnauthorizedAccessException("Bu isteği reddetme yetkiniz yok.");
        }

        if (request.Status != "pending")
        {
            throw new ArgumentException("İstek zaten işlenmiş.");
        }

        request.Status = "rejected";
        await _connectionRequestRepository.SaveAsync(request);

        // Real-time notification: connection request rejected
        await _hubContext.Clients.Users(receiverId, request.SenderId).SendAsync("ReceiveConnectionRequest");
    }

    public async Task DeleteConnectionRequestAsync(string userId, string requestId)
    {
        var request = await _connectionRequestRepository.GetByIdAsync(requestId);
        if (request == null)
        {
            throw new KeyNotFoundException("Bağlantı isteği bulunamadı.");
        }

        if (request.SenderId != userId && request.ReceiverId != userId)
        {
            throw new UnauthorizedAccessException("Bu isteği silme yetkiniz yok.");
        }

        await _connectionRequestRepository.DeleteAsync(requestId);

        // Real-time notification: connection request log deleted
        await _hubContext.Clients.User(userId).SendAsync("ReceiveConnectionRequest");
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
            Expires = DateTime.UtcNow.AddHours(12),
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

        if (user.RefreshToken != request.RefreshToken)
        {
            throw new UnauthorizedAccessException("Geçersiz refresh token / Invalid refresh token");
        }

        if (!DateTime.TryParse(user.RefreshTokenExpiryTime, out var expiryTime) || expiryTime <= DateTime.UtcNow)
        {
            throw new UnauthorizedAccessException("Refresh token süresi dolmuş / Refresh token has expired");
        }

        var newAccessToken = GenerateJwtToken(user);
        var newRefreshToken = GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7).ToString("o");
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

    private static ConnectionRequestDto MapToConnectionRequestDto(ConnectionRequest r) => new()
    {
        Id = r.Id,
        SenderId = r.SenderId,
        SenderUsername = r.SenderUsername,
        ReceiverId = r.ReceiverId,
        ReceiverUsername = r.ReceiverUsername,
        Status = r.Status,
        CreatedAt = r.CreatedAt
    };

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
            user.City = dto.City ?? string.Empty;
            user.IsVisibleToSellers = dto.IsVisibleToSellers;

            // Keywords selection (up to 3 keywords)
            if (dto.Keywords != null && dto.Keywords.Count > 3)
            {
                throw new ArgumentException("En fazla 3 kategori/anahtar kelime seçebilirsiniz!");
            }
            user.Keywords = dto.Keywords ?? new List<string>();

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

            // Process product images using _imageStorageService.StoreImageAsync
            var processedImages = new List<string>();
            if (dto.ProductImages != null)
            {
                foreach (var img in dto.ProductImages)
                {
                    var url = await _imageStorageService.StoreImageAsync(img);
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

    public async Task<PagedResultDto<UserProfileDto>> SearchManufacturersAsync(string? city, string? keyword, string? cursor, int limit)
    {
        var (users, nextCursor) = await _userRepository.SearchManufacturersAsync(city, keyword, cursor, limit);
        
        var items = users.Select(MapToProfileDto).ToList();

        return new PagedResultDto<UserProfileDto>
        {
            Items = items,
            NextCursor = nextCursor
        };
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

        if (newPassword.Length < 6 || newPassword.Length > 20)
        {
            throw new ArgumentException("Yeni şifre en az 6, en fazla 20 karakter uzunluğunda olmalıdır!");
        }

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

    public async Task LogoutAsync(string userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı.");
        }

        user.RefreshToken = string.Empty;
        user.RefreshTokenExpiryTime = string.Empty;
        await _userRepository.SaveAsync(user);
    }
}
