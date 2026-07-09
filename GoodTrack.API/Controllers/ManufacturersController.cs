using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Constants;
using GoodTrack.API.Models;
using GoodTrack.API.DTOs.Auth;
using GoodTrack.API.DTOs.Common;

namespace GoodTrack.API.Controllers;

[Authorize]
[EnableRateLimiting("api-general")]
public class ManufacturersController : BaseApiController
{
    private readonly IConnectionService _connectionService;
    private readonly IProfileService _profileService;
    private readonly ICreditsService _creditsService;
    private readonly ILogger<ManufacturersController> _logger;

    public ManufacturersController(
        IConnectionService connectionService,
        IProfileService profileService,
        ICreditsService creditsService,
        ILogger<ManufacturersController> logger)
    {
        _connectionService = connectionService;
        _profileService = profileService;
        _creditsService = creditsService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        bool isFreePlan = false;
        if (Roles.Seller.Equals(role, StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(userId))
        {
            var credits = await _creditsService.GetOrCreateCreditsAsync(userId, cancellationToken);
            if (credits.Plan.Equals(SubscriptionPlan.Free, StringComparison.OrdinalIgnoreCase))
            {
                isFreePlan = true;
            }
        }

        _logger.LogInformation("Fetching list of all registered manufacturer accounts");
        var manufacturers = await _connectionService.GetAvailableManufacturersAsync();

        if (isFreePlan)
        {
            var masked = manufacturers.Select(m => new UserDto
            {
                Id = m.Id,
                Username = "mfr_" + (m.Username.Length > 4 ? m.Username.Substring(0, 3) : "hidden") + "•••",
                Role = m.Role
            }).ToList();
            return Ok(new ApiResponse<List<UserDto>>(masked));
        }

        return Ok(new ApiResponse<List<UserDto>>(manufacturers));
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] string? city,
        [FromQuery] string? keyword,
        [FromQuery] bool mustHaveGallery,
        [FromQuery] bool mustHaveAvatar,
        [FromQuery] string? cursor,
        [FromQuery] int limit = 10,
        CancellationToken cancellationToken = default)
    {
        var userId = GetCurrentUserId();
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        bool isFreePlan = false;
        if (Roles.Seller.Equals(role, StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(userId))
        {
            var credits = await _creditsService.GetOrCreateCreditsAsync(userId, cancellationToken);
            if (credits.Plan.Equals(SubscriptionPlan.Free, StringComparison.OrdinalIgnoreCase))
            {
                isFreePlan = true;
            }
        }

        limit = Math.Clamp(limit, 1, 50);
        var results = await _profileService.SearchManufacturersAsync(city, keyword, cursor, limit, mustHaveGallery, mustHaveAvatar);

        // Apply enterprise obfuscation if user is on Free plan
        if (isFreePlan && results.Items != null)
        {
            foreach (var item in results.Items)
            {
                item.Username = "mfr_" + (item.Username.Length > 4 ? item.Username.Substring(0, 3) : "hidden") + "•••";
                item.FirstName = MaskFirstName(item.FirstName);
                item.LastName = MaskLastName(item.LastName);
                item.PhoneNumber = MaskPhoneNumber(item.PhoneNumber);
                item.Email = MaskEmail(item.Email);
                item.Address = "Planınızı yükselterek adresi görüntüleyin.";
            }
        }

        return Ok(new ApiResponse<PagedResultDto<UserProfileDto>>(results));
    }

    private static string MaskFirstName(string? firstName)
    {
        if (string.IsNullOrWhiteSpace(firstName)) return "Üretici";
        return firstName.Substring(0, 1) + "•••";
    }

    private static string MaskLastName(string? lastName)
    {
        if (string.IsNullOrWhiteSpace(lastName)) return "";
        return lastName.Substring(0, 1) + "•••";
    }

    private static string MaskPhoneNumber(string? phone)
    {
        return "+90 (•••) ••• •• ••";
    }

    private static string MaskEmail(string? email)
    {
        return "•••••@•••••.com";
    }
}
