using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using System.Threading.Tasks;
using System;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Auth;

namespace GoodTrack.API.Controllers;

[Authorize]
[EnableRateLimiting("api-general")]
public class ProfileController : BaseApiController
{
    private readonly IProfileService _profileService;
    private readonly IConnectionService _connectionService;
    private readonly ILogger<ProfileController> _logger;

    public ProfileController(
        IProfileService profileService,
        IConnectionService connectionService,
        ILogger<ProfileController> logger)
    {
        _profileService = profileService;
        _connectionService = connectionService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var profile = await _profileService.GetProfileAsync(userId);
        return Ok(profile);
    }

    [HttpGet("{username}")]
    public async Task<IActionResult> GetProfileByUsername(string username)
    {
        var currentUserId = GetCurrentUserId();
        var currentUserUsername = User.FindFirst(ClaimTypes.Name)?.Value;
        if (currentUserId == null || string.IsNullOrEmpty(currentUserUsername))
        {
            return Unauthorized();
        }

        bool isSelf = currentUserUsername.Equals(username, StringComparison.OrdinalIgnoreCase);
        bool isConnected = false;

        if (!isSelf)
        {
            var connections = await _connectionService.GetConnectionsAsync(currentUserId);
            isConnected = System.Linq.Enumerable.Any(connections, c => c.Username.Equals(username, StringComparison.OrdinalIgnoreCase));
        }

        if (!isSelf && !isConnected)
        {
            // Return 403 Forbidden instead of 400 Bad Request since it is an authorization issue
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Sadece bağlantınız olan kullanıcıların profillerini görüntüleyebilirsiniz." });
        }

        var profile = await _profileService.GetProfileByUsernameAsync(username);
        return Ok(profile);
    }

    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UserProfileDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        if (dto == null)
        {
            return BadRequest(new { message = "Profil güncelleme istek verisi eksik." });
        }

        await _profileService.UpdateProfileAsync(userId, dto);
        return Ok(new { message = "Profil başarıyla güncellendi." });
    }
}
