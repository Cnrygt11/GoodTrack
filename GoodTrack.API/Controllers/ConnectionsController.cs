using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Auth;
using GoodTrack.API.DTOs.Common;
using GoodTrack.API.Constants;

namespace GoodTrack.API.Controllers;

[Authorize]
[EnableRateLimiting("api-general")]
public class ConnectionsController : BaseApiController
{
    private readonly IConnectionService _connectionService;
    private readonly ILogger<ConnectionsController> _logger;

    public ConnectionsController(IConnectionService connectionService, ILogger<ConnectionsController> logger)
    {
        _connectionService = connectionService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetConnections()
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        _logger.LogInformation("User {UserId} is retrieving active connections list", userId);
        var connections = await _connectionService.GetConnectionsAsync(userId);
        return Ok(new ApiResponse<List<UserDto>>(connections));
    }

    [HttpPost]
    public async Task<IActionResult> SendConnectionRequest([FromQuery] string username)
    {
        var senderId = GetCurrentUserId();
        var senderUsername = User.FindFirst(ClaimTypes.Name)?.Value;
        var senderRole = GetCurrentUserRole();

        if (senderId is null || string.IsNullOrEmpty(senderUsername) || string.IsNullOrEmpty(senderRole))
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        if (string.IsNullOrWhiteSpace(username))
        {
            return BadRequest(ApiResponse.Fail(Messages.Auth.UsernameRequired));
        }

        _logger.LogInformation("User {SenderId} ({Username}) is sending a connection request to user: {Target}", senderId, senderUsername, username);
        await _connectionService.SendConnectionRequestAsync(senderId, senderUsername, senderRole, username);

        return Created(string.Empty, ApiResponse.Ok("Bağlantı isteği gönderildi."));
    }

    [HttpGet("requests/incoming")]
    public async Task<IActionResult> GetIncomingRequests()
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        _logger.LogInformation("User {UserId} is fetching pending incoming connection requests", userId);
        var requests = await _connectionService.GetIncomingRequestsAsync(userId);
        return Ok(new ApiResponse<List<ConnectionRequestDto>>(requests));
    }

    [HttpGet("requests/sent")]
    public async Task<IActionResult> GetSentRequests()
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        _logger.LogInformation("User {UserId} is fetching sent connection requests history", userId);
        var requests = await _connectionService.GetSentRequestsAsync(userId);
        return Ok(new ApiResponse<List<ConnectionRequestDto>>(requests));
    }

    [HttpPatch("requests/{requestId}")]
    public async Task<IActionResult> UpdateRequest(string requestId, [FromBody] UpdateConnectionRequestDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        if (dto == null)
        {
            return BadRequest(ApiResponse.Fail(Messages.Common.MissingRequestData));
        }

        _logger.LogInformation("User {UserId} is updating connection request {RequestId} to status: {Status}", userId, requestId, dto.Status);

        if (dto.Status.Equals(ConnectionRequestStatus.Accepted, StringComparison.OrdinalIgnoreCase))
        {
            await _connectionService.AcceptConnectionRequestAsync(userId, requestId);
            return Ok(ApiResponse.Ok("Bağlantı başarıyla kuruldu."));
        }
        else if (dto.Status.Equals(ConnectionRequestStatus.Rejected, StringComparison.OrdinalIgnoreCase))
        {
            await _connectionService.RejectConnectionRequestAsync(userId, requestId);
            return Ok(ApiResponse.Ok("Bağlantı isteği reddedildi."));
        }

        return BadRequest(ApiResponse.Fail("Geçersiz durum bilgisi."));
    }

    [HttpDelete("requests/{requestId}")]
    public async Task<IActionResult> DeleteRequest(string requestId)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        _logger.LogInformation("User {UserId} is clearing connection request log: {RequestId}", userId, requestId);
        await _connectionService.DeleteConnectionRequestAsync(userId, requestId);
        return NoContent();
    }

    [HttpDelete("{targetId}")]
    public async Task<IActionResult> RemoveConnection(string targetId)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        _logger.LogInformation("User {UserId} is removing active connection with user: {TargetId}", userId, targetId);
        await _connectionService.RemoveConnectionAsync(userId, targetId);
        return NoContent();
    }
}
