using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Auth;

namespace GoodTrack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (request == null)
        {
            return BadRequest(new { message = "Kayıt istek verisi eksik." });
        }
        _logger.LogInformation("Processing register request for username: {Username}", request.Username);
        string baseUrl = $"{Request.Scheme}://{Request.Host}";
        await _authService.RegisterAsync(request, baseUrl);
        return Ok(new { message = "Kullanıcı başarıyla kaydedildi.", username = request.Username.Trim().ToLower(), role = request.Role });
    }

    [HttpGet("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromQuery] string username, [FromQuery] string token)
    {
        _logger.LogInformation("Processing email verification link for username: {Username}", username);
        try
        {
            await _authService.VerifyEmailAsync(username, token);
            string successHtml = GetVerificationResultHtml(true, "Hesabınız başarıyla doğrulandı! Giriş yapabilirsiniz.", "Account verified successfully! You can now log in.");
            return Content(successHtml, "text/html", System.Text.Encoding.UTF8);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Email verification link failed for {Username}: {Message}", username, ex.Message);
            string errorHtml = GetVerificationResultHtml(false, ex.Message, "Verification link is invalid or expired.");
            return Content(errorHtml, "text/html", System.Text.Encoding.UTF8);
        }
    }


    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (request == null)
        {
            return BadRequest(new { message = "Giriş istek verisi eksik." });
        }
        _logger.LogInformation("Processing login request for username: {Username}", request.Username);
        var response = await _authService.LoginAsync(request);
        return Ok(new { token = response.Token, username = response.Username, role = response.Role, userId = response.UserId, message = "Giriş başarılı." });
    }

    [Authorize]
    [HttpGet("connections")]
    public async Task<IActionResult> GetConnections()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        _logger.LogInformation("User {UserId} is retrieving active connections list", userId);
        var connections = await _authService.GetConnectionsAsync(userId);
        return Ok(connections);
    }

    [Authorize]
    [HttpPost("connections/send-request")]
    public async Task<IActionResult> SendConnectionRequest([FromQuery] string username)
    {
        var senderId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var senderUsername = User.FindFirst(ClaimTypes.Name)?.Value;
        var senderRole = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(senderId) || string.IsNullOrEmpty(senderUsername) || string.IsNullOrEmpty(senderRole))
        {
            return Unauthorized();
        }

        _logger.LogInformation("User {SenderId} ({Username}) is sending a connection request to user: {Target}", senderId, senderUsername, username);
        await _authService.SendConnectionRequestAsync(senderId, senderUsername, senderRole, username);
        return Ok(new { message = "Bağlantı isteği gönderildi." });
    }

    [Authorize]
    [HttpGet("connections/requests/incoming")]
    public async Task<IActionResult> GetIncomingRequests()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        _logger.LogInformation("User {UserId} is fetching pending incoming connection requests", userId);
        var requests = await _authService.GetIncomingRequestsAsync(userId);
        return Ok(requests);
    }

    [Authorize]
    [HttpGet("connections/requests/sent")]
    public async Task<IActionResult> GetSentRequests()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        _logger.LogInformation("User {UserId} is fetching sent connection requests history", userId);
        var requests = await _authService.GetSentRequestsAsync(userId);
        return Ok(requests);
    }

    [Authorize]
    [HttpPost("connections/requests/{requestId}/accept")]
    public async Task<IActionResult> AcceptRequest(string requestId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        _logger.LogInformation("User {UserId} is accepting connection request {RequestId}", userId, requestId);
        await _authService.AcceptConnectionRequestAsync(userId, requestId);
        return Ok(new { message = "Bağlantı başarıyla kuruldu." });
    }

    [Authorize]
    [HttpPost("connections/requests/{requestId}/reject")]
    public async Task<IActionResult> RejectRequest(string requestId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        _logger.LogInformation("User {UserId} is rejecting connection request {RequestId}", userId, requestId);
        await _authService.RejectConnectionRequestAsync(userId, requestId);
        return Ok(new { message = "Bağlantı isteği reddedildi." });
    }

    [Authorize]
    [HttpDelete("connections/requests/{requestId}")]
    public async Task<IActionResult> DeleteRequest(string requestId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        _logger.LogInformation("User {UserId} is clearing connection request log: {RequestId}", userId, requestId);
        await _authService.DeleteConnectionRequestAsync(userId, requestId);
        return Ok(new { message = "İstek geçmişten temizlendi." });
    }

    [Authorize]
    [HttpDelete("connections/{targetId}")]
    public async Task<IActionResult> RemoveConnection(string targetId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        _logger.LogInformation("User {UserId} is removing active connection with user: {TargetId}", userId, targetId);
        await _authService.RemoveConnectionAsync(userId, targetId);
        return Ok(new { message = "Bağlantı başarıyla kaldırıldı." });
    }

    [HttpGet("manufacturers")]
    public async Task<IActionResult> GetManufacturers()
    {
        _logger.LogInformation("Fetching list of all registered manufacturer accounts");
        var manufacturers = await _authService.GetAvailableManufacturersAsync();
        return Ok(manufacturers);
    }

    [Authorize]
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        try
        {
            var profile = await _authService.GetProfileAsync(userId);
            return Ok(profile);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("verify-password")]
    public async Task<IActionResult> VerifyPassword([FromBody] VerifyPasswordRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        if (request == null || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Şifre alanı boş olamaz!" });
        }

        var isValid = await _authService.VerifyPasswordAsync(userId, request.Password);
        if (!isValid)
        {
            return BadRequest(new { message = "Eski şifre hatalı!" });
        }

        return Ok(new { success = true, message = "Şifre doğrulandı." });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        if (request == null)
        {
            return BadRequest(new { message = "İstek verisi eksik." });
        }

        try
        {
            await _authService.ChangePasswordAsync(userId, request.OldPassword, request.NewPassword, request.ConfirmNewPassword);
            return Ok(new { message = "Şifreniz başarıyla güncellendi." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    private string GetVerificationResultHtml(bool isSuccess, string messageTr, string messageEn)

    {
        string iconClass = isSuccess ? "icon-success" : "icon-error";
        string iconSymbol = isSuccess ? "✓" : "✗";
        string title = isSuccess ? "Doğrulama Başarılı / Verification Successful" : "Doğrulama Başarısız / Verification Failed";
        string redirectMeta = isSuccess ? "<meta http-equiv=\"refresh\" content=\"4;url=/\" />" : "";
        string infoText = isSuccess 
            ? "4 saniye içinde otomatik olarak giriş sayfasına yönlendiriliyorsunuz..." 
            : "Lütfen kayıt sayfasına dönerek yeni bir doğrulama bağlantısı talep edin.";

        return $@"<!DOCTYPE html>
<html lang=""tr"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    {redirectMeta}
    <title>GoodTrack - E-posta Doğrulama</title>
    <link href=""https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap"" rel=""stylesheet"">
    <style>
        :root {{
            --bg: #0b0f19;
            --surface: rgba(23, 28, 41, 0.6);
            --text-main: #f8fafc;
            --text-sub: #94a3b8;
            --primary: #06b6d4;
            --primary-glow: rgba(6, 182, 212, 0.15);
            --success: #10b981;
            --danger: #ef4444;
            --border: rgba(255, 255, 255, 0.08);
        }}
        body {{
            margin: 0;
            padding: 0;
            background: var(--bg);
            font-family: 'Outfit', sans-serif;
            color: var(--text-main);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
            position: relative;
        }}
        body::before {{
            content: '';
            position: absolute;
            width: 300px;
            height: 300px;
            background: var(--primary-glow);
            border-radius: 50%;
            filter: blur(100px);
            top: 20%;
            left: 10%;
            z-index: 1;
        }}
        body::after {{
            content: '';
            position: absolute;
            width: 300px;
            height: 300px;
            background: rgba(168, 85, 247, 0.1);
            border-radius: 50%;
            filter: blur(100px);
            bottom: 20%;
            right: 10%;
            z-index: 1;
        }}
        .container {{
            position: relative;
            z-index: 10;
            background: var(--surface);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 40px;
            width: 90%;
            max-width: 440px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
            animation: fadeIn 0.8s ease-out;
        }}
        @keyframes fadeIn {{
            from {{ opacity: 0; transform: translateY(20px); }}
            to {{ opacity: 1; transform: translateY(0); }}
        }}
        .icon-container {{
            width: 72px;
            height: 72px;
            border-radius: 50%;
            margin: 0 auto 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            font-weight: bold;
        }}
        .icon-success {{
            background: rgba(16, 185, 129, 0.1);
            color: var(--success);
            border: 1px solid rgba(16, 185, 129, 0.2);
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
        }}
        .icon-error {{
            background: rgba(239, 68, 68, 0.1);
            color: var(--danger);
            border: 1px solid rgba(239, 68, 68, 0.2);
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.15);
        }}
        h2 {{
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 16px;
            letter-spacing: -0.5px;
        }}
        p {{
            font-size: 14px;
            color: var(--text-sub);
            line-height: 1.6;
            margin: 0 0 24px;
        }}
        .btn {{
            display: inline-block;
            background: var(--primary);
            color: #0b0f19;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(6, 182, 212, 0.25);
            border: none;
            cursor: pointer;
        }}
        .btn:hover {{
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(6, 182, 212, 0.4);
        }}
        .redirect-text {{
            font-size: 12px;
            color: #64748b;
            margin-top: 16px;
        }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""icon-container {iconClass}"">{iconSymbol}</div>
        <h2>{title}</h2>
        <p style=""color: var(--text-main); font-weight: 500;"">{messageTr}</p>
        <p style=""font-size: 13px;"">{messageEn}</p>
        <div style=""margin-top: 24px;"">
            <a href=""/"" class=""btn"">Giriş Yap / Sign In</a>
        </div>
        <div class=""redirect-text"">{infoText}</div>
    </div>
</body>
</html>";
    }
}
