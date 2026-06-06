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
        await _authService.RegisterAsync(request);
        return Ok(new { message = "Kullanıcı başarıyla kaydedildi.", username = request.Username.Trim().ToLower(), role = request.Role });
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        if (request == null)
        {
            return BadRequest(new { message = "E-posta doğrulama istek verisi eksik." });
        }
        _logger.LogInformation("Processing email verification for username: {Username}", request.Username);
        await _authService.VerifyEmailAsync(request.Username, request.Code);
        return Ok(new { message = "E-posta başarıyla doğrulandı. Hesabınız aktif edildi." });
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
}
