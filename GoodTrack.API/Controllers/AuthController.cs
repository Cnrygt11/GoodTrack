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

public class AuthController : BaseApiController
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;
    private readonly IConfiguration _configuration;

    public AuthController(IAuthService authService, ILogger<AuthController> logger, IConfiguration configuration)
    {
        _authService = authService;
        _logger = logger;
        _configuration = configuration;
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
        
        // Resolve frontend URL
        string frontendUrl = "http://localhost:5173";
        var envOrigins = Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS");
        if (!string.IsNullOrEmpty(envOrigins))
        {
            var split = envOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (split.Length > 0)
            {
                frontendUrl = split[0];
            }
        }
        else
        {
            var configOrigins = _configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
            if (configOrigins != null && configOrigins.Length > 0)
            {
                frontendUrl = configOrigins[0];
            }
        }
        
        frontendUrl = frontendUrl.TrimEnd('/');

        try
        {
            await _authService.VerifyEmailAsync(username, token);
            return Redirect($"{frontendUrl}/login?verified=true");
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Email verification link failed for {Username}: {Message}", username, ex.Message);
            return Redirect($"{frontendUrl}/login?verificationError={Uri.EscapeDataString(ex.Message)}");
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
        var userId = GetCurrentUserId();
        if (userId is null)
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
        var senderId = GetCurrentUserId();
        var senderUsername = User.FindFirst(ClaimTypes.Name)?.Value;
        var senderRole = User.FindFirst(ClaimTypes.Role)?.Value;

        if (senderId is null || string.IsNullOrEmpty(senderUsername) || string.IsNullOrEmpty(senderRole))
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
        var userId = GetCurrentUserId();
        if (userId is null)
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
        var userId = GetCurrentUserId();
        if (userId is null)
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
        var userId = GetCurrentUserId();
        if (userId is null)
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
        var userId = GetCurrentUserId();
        if (userId is null)
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
        var userId = GetCurrentUserId();
        if (userId is null)
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
        var userId = GetCurrentUserId();
        if (userId is null)
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
        var userId = GetCurrentUserId();
        if (userId is null)
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
    [HttpGet("profile/{username}")]
    public async Task<IActionResult> GetProfileByUsername(string username)
    {
        try
        {
            var profile = await _authService.GetProfileByUsernameAsync(username);
            return Ok(profile);
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

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UserProfileDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        try
        {
            await _authService.UpdateProfileAsync(userId, dto);
            return Ok(new { message = "Profil başarıyla güncellendi." });
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

    [Authorize]
    [HttpGet("manufacturers/search")]
    public async Task<IActionResult> SearchManufacturers([FromQuery] string? city, [FromQuery] string? keyword)
    {
        try
        {
            var results = await _authService.SearchManufacturersAsync(city, keyword);
            return Ok(results);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("verify-password")]
    public async Task<IActionResult> VerifyPassword([FromBody] VerifyPasswordRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
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
        var userId = GetCurrentUserId();
        if (userId is null)
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

}

