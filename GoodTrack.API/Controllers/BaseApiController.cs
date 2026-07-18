using Microsoft.AspNetCore.Mvc;
using System.Diagnostics.CodeAnalysis;
using System.Security.Claims;
using GoodTrack.API.Constants;
using GoodTrack.API.DTOs.Common;

namespace GoodTrack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public abstract class BaseApiController : ControllerBase
{
    protected string? GetCurrentUserId()
        => User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    /// <summary>Kimliği doğrulanmış kullanıcının rolü (seller/mfr/admin); claim yoksa null.</summary>
    protected string? GetCurrentUserRole()
        => User.FindFirst(ClaimTypes.Role)?.Value;

    /// <summary>
    /// Kullanıcı kimliğini okur; claim yoksa <paramref name="error"/> standart 401 yanıtı olur.
    /// Kullanım: <c>if (!TryGetCurrentUserId(out var userId, out var error)) return error;</c>
    /// </summary>
    protected bool TryGetCurrentUserId([NotNullWhen(true)] out string? userId, [NotNullWhen(false)] out IActionResult? error)
    {
        userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
        {
            error = Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
            return false;
        }

        error = null;
        return true;
    }

    /// <summary>Kimlik + rol claim'lerini birlikte okur; biri eksikse standart 401 yanıtı üretir.</summary>
    protected bool TryGetCurrentUser([NotNullWhen(true)] out string? userId, [NotNullWhen(true)] out string? role, [NotNullWhen(false)] out IActionResult? error)
    {
        userId = GetCurrentUserId();
        role = GetCurrentUserRole();
        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(role))
        {
            error = Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
            return false;
        }

        error = null;
        return true;
    }
}
