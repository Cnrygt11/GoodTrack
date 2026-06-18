using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Auth;

namespace GoodTrack.API.Controllers;

[Authorize]
[EnableRateLimiting("api-general")]
public class ConnectionsController : BaseApiController
{
    private readonly IAuthService _authService;
    private readonly ILogger<ConnectionsController> _logger;

    public ConnectionsController(IAuthService authService, ILogger<ConnectionsController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    [HttpGet]
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

    [HttpPost]
    public async Task<IActionResult> SendConnectionRequest([FromQuery] string username)
    {
        var senderId = GetCurrentUserId();
        var senderUsername = User.FindFirst(ClaimTypes.Name)?.Value;
        var senderRole = User.FindFirst(ClaimTypes.Role)?.Value;

        if (senderId is null || string.IsNullOrEmpty(senderUsername) || string.IsNullOrEmpty(senderRole))
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(username))
        {
            return BadRequest(new { message = "Kullanıcı adı boş olamaz." });
        }

        _logger.LogInformation("User {SenderId} ({Username}) is sending a connection request to user: {Target}", senderId, senderUsername, username);
        await _authService.SendConnectionRequestAsync(senderId, senderUsername, senderRole, username);
        
        return Created(string.Empty, new { message = "Bağlantı isteği gönderildi." });
    }

    [HttpGet("requests/incoming")]
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

    [HttpGet("requests/sent")]
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

    [HttpPatch("requests/{requestId}")]
    public async Task<IActionResult> UpdateRequest(string requestId, [FromBody] UpdateConnectionRequestDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        if (dto == null)
        {
            return BadRequest(new { message = "İstek verisi eksik." });
        }

        _logger.LogInformation("User {UserId} is updating connection request {RequestId} to status: {Status}", userId, requestId, dto.Status);

        if (dto.Status.Equals("accepted", StringComparison.OrdinalIgnoreCase))
        {
            await _authService.AcceptConnectionRequestAsync(userId, requestId);
            return Ok(new { message = "Bağlantı başarıyla kuruldu." });
        }
        else if (dto.Status.Equals("rejected", StringComparison.OrdinalIgnoreCase))
        {
            await _authService.RejectConnectionRequestAsync(userId, requestId);
            return Ok(new { message = "Bağlantı isteği reddedildi." });
        }

        return BadRequest(new { message = "Geçersiz durum bilgisi." });
    }

    [HttpDelete("requests/{requestId}")]
    public async Task<IActionResult> DeleteRequest(string requestId)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        _logger.LogInformation("User {UserId} is clearing connection request log: {RequestId}", userId, requestId);
        await _authService.DeleteConnectionRequestAsync(userId, requestId);
        return NoContent();
    }

    [HttpDelete("{targetId}")]
    public async Task<IActionResult> RemoveConnection(string targetId)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        _logger.LogInformation("User {UserId} is removing active connection with user: {TargetId}", userId, targetId);
        await _authService.RemoveConnectionAsync(userId, targetId);
        return NoContent();
    }
}
