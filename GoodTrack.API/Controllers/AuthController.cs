using GoodTrack.API.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Auth;
using GoodTrack.API.DTOs.Common;

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

    /// <summary>
    /// Registers a new user.
    /// </summary>
    [EnableRateLimiting("auth-strict")]
    [HttpPost("register")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        _logger.LogInformation("Processing register request for username: {Username}", request.Username);
        string baseUrl = $"{Request.Scheme}://{Request.Host}";
        await _authService.RegisterAsync(request, baseUrl);

        return Created(string.Empty, ApiResponse.Ok("Kullanıcı başarıyla kaydedildi."));
    }

    /// <summary>
    /// Authenticates user and returns JWT token.
    /// </summary>
    [EnableRateLimiting("auth-strict")]
    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResponse<LoginResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        _logger.LogInformation("Processing login request for username: {Username}", request.Username);
        var response = await _authService.LoginAsync(request);
        return Ok(new ApiResponse<LoginResponse>(response, "Giriş başarılı."));
    }

    /// <summary>
    /// Verifies current password of the logged in user.
    /// </summary>
    [Authorize]
    [EnableRateLimiting("auth-strict")]
    [HttpPost("verify-password")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> VerifyPassword([FromBody] VerifyPasswordRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        if (request == null || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(ApiResponse.Fail("Şifre alanı boş olamaz!"));
        }

        var isValid = await _authService.VerifyPasswordAsync(userId, request.Password);
        if (!isValid)
        {
            return Unauthorized(ApiResponse.Fail("Eski şifre hatalı!"));
        }

        return Ok(ApiResponse.Ok("Şifre doğrulandı."));
    }

    /// <summary>
    /// Changes password of the logged in user.
    /// </summary>
    [Authorize]
    [EnableRateLimiting("auth-strict")]
    [HttpPost("change-password")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        if (request == null)
        {
            return BadRequest(ApiResponse.Fail(Messages.Common.MissingRequestData));
        }

        await _authService.ChangePasswordAsync(userId, request.OldPassword, request.NewPassword, request.ConfirmNewPassword);
        return Ok(ApiResponse.Ok("Şifreniz başarıyla güncellendi."));
    }

    /// <summary>
    /// Refreshes JWT token with a valid refresh token.
    /// </summary>
    [EnableRateLimiting("auth-strict")]
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(ApiResponse<LoginResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh([FromBody] TokenRefreshRequest request)
    {
        if (request == null)
        {
            return BadRequest(ApiResponse.Fail("Yenileme isteği verisi eksik."));
        }

        try
        {
            var response = await _authService.RefreshTokenAsync(request);
            return Ok(new ApiResponse<LoginResponse>(response, "Oturum başarıyla yenilendi."));
        }
        catch (Microsoft.IdentityModel.Tokens.SecurityTokenException ex)
        {
            return Unauthorized(ApiResponse.Fail(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
    }

    /// <summary>
    /// Logs out current user.
    /// </summary>
    [Authorize]
    [HttpPost("logout")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout()
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        await _authService.LogoutAsync(userId);
        return Ok(ApiResponse.Ok("Başarıyla çıkış yapıldı."));
    }
}
