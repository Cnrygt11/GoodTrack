using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Constants;
using GoodTrack.API.Models;
using GoodTrack.API.DTOs.Common;
using GoodTrack.API.DTOs.Credits;

namespace GoodTrack.API.Controllers;

/// <summary>
/// Handles requests related to the subscription plans and user credits.
/// </summary>
[Authorize(Roles = Roles.Seller)]
[EnableRateLimiting("api-general")]
public class CreditsController : BaseApiController
{
    private readonly ICreditsService _creditsService;
    private readonly ILogger<CreditsController> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="CreditsController"/> class.
    /// </summary>
    /// <param name="creditsService">The credits management service.</param>
    /// <param name="logger">The application logger.</param>
    public CreditsController(ICreditsService creditsService, ILogger<CreditsController> logger)
    {
        _creditsService = creditsService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves the current user's credit balance and subscription plan details.
    /// </summary>
    /// <param name="cancellationToken">Token to cancel the operation.</param>
    /// <returns>The user's credit record.</returns>
    [HttpGet]
    public async Task<IActionResult> GetCredits(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
        }

        _logger.LogInformation("User {UserId} is retrieving their credit details.", userId);
        var userCredit = await _creditsService.GetOrCreateCreditsAsync(userId, cancellationToken);
        return Ok(new ApiResponse<UserCredit>(userCredit));
    }

    /// <summary>
    /// Retrieves all available subscription plans in the system.
    /// </summary>
    /// <param name="cancellationToken">Token to cancel the operation.</param>
    /// <returns>A list of available subscription plans.</returns>
    [HttpGet("plans")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPlans(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Retrieving available subscription plan details.");
        var plans = await _creditsService.GetPlansAsync(cancellationToken);
        return Ok(new ApiResponse<List<SubscriptionPlanDetail>>(plans));
    }

    /// <summary>
    /// Upgrades the user's subscription to the specified plan tier.
    /// </summary>
    /// <param name="request">The upgrade plan request parameters.</param>
    /// <param name="cancellationToken">Token to cancel the operation.</param>
    /// <returns>The updated user credit record.</returns>
    [HttpPost("upgrade")]
    public async Task<IActionResult> UpgradePlan([FromBody] UpgradePlanRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim."));
        }

        if (request == null || string.IsNullOrWhiteSpace(request.Plan))
        {
            return BadRequest(ApiResponse.Fail("Geçersiz plan verisi."));
        }

        _logger.LogInformation("User {UserId} is upgrading to plan: {Plan}", userId, request.Plan);
        var updatedCredit = await _creditsService.UpgradePlanAsync(userId, request.Plan, cancellationToken);
        return Ok(new ApiResponse<object>(new 
        { 
            message = "Plan başarıyla yükseltildi.", 
            credits = updatedCredit 
        }));
    }
}
