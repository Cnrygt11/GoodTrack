using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

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
}
