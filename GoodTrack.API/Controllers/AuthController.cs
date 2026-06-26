using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
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

    [EnableRateLimiting("auth-strict")]
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
        
        return Created(string.Empty, new { message = "Kullanıcı başarıyla kaydedildi.", username = request.Username.Trim().ToLower(), role = request.Role });
    }

    [EnableRateLimiting("auth-strict")]
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
    [EnableRateLimiting("auth-strict")]
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
            return Unauthorized(new { message = "Eski şifre hatalı!" });
        }

        return Ok(new { success = true, message = "Şifre doğrulandı." });
    }

    [Authorize]
    [EnableRateLimiting("auth-strict")]
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

        await _authService.ChangePasswordAsync(userId, request.OldPassword, request.NewPassword, request.ConfirmNewPassword);
        return Ok(new { message = "Şifreniz başarıyla güncellendi." });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] TokenRefreshRequest request)
    {
        if (request == null)
        {
            return BadRequest(new { message = "Yenileme isteği verisi eksik." });
        }

        try
        {
            var response = await _authService.RefreshTokenAsync(request);
            return Ok(new
            {
                token = response.Token,
                refreshToken = response.RefreshToken,
                username = response.Username,
                role = response.Role,
                userId = response.UserId,
                message = "Token başarıyla yenilendi."
            });
        }
        catch (Microsoft.IdentityModel.Tokens.SecurityTokenException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        await _authService.LogoutAsync(userId);
        return Ok(new { message = "Başarıyla çıkış yapıldı." });
    }
}
