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
using GoodTrack.API.DTOs.Common;

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

    /// <summary>
    /// Retrieves the profile of the current logged-in user.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<UserProfileDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
        }

        var profile = await _profileService.GetProfileAsync(userId);
        return Ok(new ApiResponse<UserProfileDto>(profile));
    }

    /// <summary>
    /// Retrieves profile details of another user by username (must be a connection).
    /// </summary>
    [HttpGet("{username}")]
    [ProducesResponseType(typeof(ApiResponse<UserProfileDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetProfileByUsername(string username)
    {
        var currentUserId = GetCurrentUserId();
        var currentUserUsername = User.FindFirst(ClaimTypes.Name)?.Value;
        if (currentUserId == null || string.IsNullOrEmpty(currentUserUsername))
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
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
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse.Fail("Sadece bağlantınız olan kullanıcıların profillerini görüntüleyebilirsiniz."));
        }

        var profile = await _profileService.GetProfileByUsernameAsync(username);
        return Ok(new ApiResponse<UserProfileDto>(profile));
    }

    /// <summary>
    /// Updates the current user's profile.
    /// </summary>
    [HttpPut]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdateProfile([FromBody] UserProfileDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
        }

        await _profileService.UpdateProfileAsync(userId, dto);
        return Ok(ApiResponse.Ok("Profil başarıyla güncellendi."));
    }

    /// <summary>
    /// Deactivates (soft-deletes) the current user's account after password confirmation.
    /// The session ends; the user can reactivate by logging in again with the correct password.
    /// </summary>
    [HttpPost("deactivate")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DeactivateAccount([FromBody] DeactivateAccountDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
        }

        try
        {
            await _profileService.DeactivateAccountAsync(userId, dto?.Password ?? string.Empty);
            return Ok(ApiResponse.Ok("Hesabınız deaktive edildi. Doğru şifreyle giriş yaparak yeniden aktifleştirebilirsiniz."));
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ApiResponse.Fail("Şifre hatalı."));
        }
    }
}
