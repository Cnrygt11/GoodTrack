using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;

namespace GoodTrack.API.Controllers;

[Authorize]
[EnableRateLimiting("api-general")]
public class ManufacturersController : BaseApiController
{
    private readonly IAuthService _authService;
    private readonly ILogger<ManufacturersController> _logger;

    public ManufacturersController(IAuthService authService, ILogger<ManufacturersController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    [HttpGet]
    [AllowAnonymous] // Original GetManufacturers didn't have [Authorize] filter on method, only class-level which was AuthController (AuthController has Authorize on specific endpoints, but not class-level. Wait, let's verify if original GetManufacturers was authorized)
    // Ah, original GetManufacturers did not have [Authorize] attribute in AuthController, but AuthController had no class-level [Authorize].
    // Let's verify the auth requirements for manufacturers.
    // In AuthController:
    // [EnableRateLimiting("api-general")]
    // [HttpGet("manufacturers")]
    // public async Task<IActionResult> GetManufacturers() ...
    // Yes! It was anonymous. But SearchManufacturers had [Authorize] attribute:
    // [Authorize]
    // [EnableRateLimiting("api-general")]
    // [HttpGet("manufacturers/search")]
    // public async Task<IActionResult> SearchManufacturers(...) ...
    // So indeed, GetManufacturers should be anonymous, and SearchManufacturers should be authorized.
    public async Task<IActionResult> GetAll()
    {
        _logger.LogInformation("Fetching list of all registered manufacturer accounts");
        var manufacturers = await _authService.GetAvailableManufacturersAsync();
        return Ok(manufacturers);
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] string? city, 
        [FromQuery] string? keyword,
        [FromQuery] string? cursor,
        [FromQuery] int limit = 10)
    {
        limit = Math.Clamp(limit, 1, 50);
        var results = await _authService.SearchManufacturersAsync(city, keyword, cursor, limit);
        return Ok(results);
    }
}
