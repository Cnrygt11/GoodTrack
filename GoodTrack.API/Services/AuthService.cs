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

namespace GoodTrack.API.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IConnectionRequestRepository _connectionRequestRepository;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IConfiguration _configuration;
    private readonly IHubContext<TrackingHub> _hubContext;
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository userRepository,
        IConnectionRequestRepository connectionRequestRepository,
        IPasswordHasher<User> passwordHasher,
        IConfiguration configuration,
        IHubContext<TrackingHub> hubContext,
        IEmailService emailService,
        ILogger<AuthService> logger)
    {
        _userRepository = userRepository;
        _connectionRequestRepository = connectionRequestRepository;
        _passwordHasher = passwordHasher;
        _configuration = configuration;
        _hubContext = hubContext;
        _emailService = emailService;
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

        return new LoginResponse
        {
            Token = token,
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

        // 3. Password Length (6-20 chars)
        if (request.Password.Length < 6 || request.Password.Length > 20)
        {
            throw new ArgumentException("Şifre en az 6, en fazla 20 karakter uzunluğunda olmalıdır!");
        }

        if (request.Password != request.ConfirmPassword)
        {
            throw new ArgumentException("Şifreler uyuşmuyor!");
        }

        if (request.Role != "seller" && request.Role != "mfr")
        {
            throw new ArgumentException("Geçersiz rol! Sadece 'seller' veya 'mfr' olabilir.");
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

        var verificationToken = Guid.NewGuid().ToString("N");

        var user = new User
        {
            Username = usernameClean,
            Email = emailClean,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Role = request.Role,
            CreatedAt = DateTime.UtcNow.ToString("o"),
            IsActive = false,
            VerificationToken = verificationToken,
            VerificationTokenExpiresAt = DateTime.UtcNow.AddMinutes(15).ToString("o")
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        await _userRepository.SaveAsync(user);

        // Generate dynamic verification link
        var verificationLink = $"{baseUrl.TrimEnd('/')}/api/auth/verify-email?username={Uri.EscapeDataString(user.Username)}&token={Uri.EscapeDataString(verificationToken)}";

        // Send Email asynchronously in background so registration is fast
        _ = Task.Run(async () =>
        {
            try
            {
                await _emailService.SendVerificationEmailAsync(user.Email, verificationLink);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send verification email to {Email}", user.Email);
            }
        });
    }

    public async Task VerifyEmailAsync(string username, string token)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(token))
        {
            throw new ArgumentException("Kullanıcı adı ve doğrulama bağlantısı geçersiz!");
        }

        var usernameClean = username.Trim().ToLower();
        var user = await _userRepository.GetByUsernameAsync(usernameClean);
        if (user == null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı.");
        }

        if (user.IsActive)
        {
            return; // Already active, no further action needed
        }

        if (user.VerificationToken != token.Trim())
        {
            throw new ArgumentException("Doğrulama bağlantısı geçersiz veya hatalı!");
        }

        if (string.IsNullOrEmpty(user.VerificationTokenExpiresAt) || 
            DateTime.Parse(user.VerificationTokenExpiresAt) < DateTime.UtcNow)
        {
            throw new ArgumentException("Doğrulama bağlantısının süresi dolmuş!");
        }

        user.IsActive = true;
        user.VerificationToken = string.Empty;
        user.VerificationTokenExpiresAt = string.Empty;

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

        var list = new List<UserDto>();
        foreach (var connectedId in user.AssociatedUserIds)
        {
            var target = await _userRepository.GetByIdAsync(connectedId);
            if (target != null)
            {
                list.Add(new UserDto { Id = target.Id, Username = target.Username, Role = target.Role });
            }
        }
        return list;
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
            var oppositeRoleText = (senderRole == "seller") ? "üretici" : "satıcı";
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
        return requests.Select(r => new ConnectionRequestDto
        {
            Id = r.Id,
            SenderId = r.SenderId,
            SenderUsername = r.SenderUsername,
            ReceiverId = r.ReceiverId,
            ReceiverUsername = r.ReceiverUsername,
            Status = r.Status,
            CreatedAt = r.CreatedAt
        }).ToList();
    }

    public async Task<List<ConnectionRequestDto>> GetSentRequestsAsync(string senderId)
    {
        var requests = await _connectionRequestRepository.GetSentRequestsAsync(senderId);
        return requests.Select(r => new ConnectionRequestDto
        {
            Id = r.Id,
            SenderId = r.SenderId,
            SenderUsername = r.SenderUsername,
            ReceiverId = r.ReceiverId,
            ReceiverUsername = r.ReceiverUsername,
            Status = r.Status,
            CreatedAt = r.CreatedAt
        }).ToList();
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
        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtKey = _configuration["Jwt:Key"] ?? "GoodTrackProductionTrackingSystemSuperSecretKey2026!";
        var key = Encoding.UTF8.GetBytes(jwtKey);
        
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role)
            }),
            Expires = DateTime.UtcNow.AddDays(7),
            Issuer = _configuration["Jwt:Issuer"] ?? "GoodTrack.API",
            Audience = _configuration["Jwt:Audience"] ?? "GoodTrack.Client",
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
