using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;
using GoodTrack.API.DTOs.Common;
using GoodTrack.API.DTOs.Credits;
using GoodTrack.API.Models;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Constants;
using System.Threading;

namespace GoodTrack.API.Controllers;

[Authorize(Roles = Roles.Seller)]
[EnableRateLimiting("api-general")]
public class CreditsController : BaseApiController
{
    private readonly ICreditsService _creditsService;

    public CreditsController(ICreditsService creditsService)
    {
        _creditsService = creditsService;
    }

    /// <summary>
    /// Gets current credits for the authenticated user.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<UserCredit>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCredits(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        var credits = await _creditsService.GetOrCreateCreditsAsync(userId, cancellationToken);
        return Ok(ApiResponse<UserCredit>.Ok(credits));
    }

    /// <summary>
    /// Upgrades the user plan.
    /// </summary>
    [HttpPost("upgrade")]
    [ProducesResponseType(typeof(ApiResponse<UserCredit>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpgradePlan([FromBody] UpgradePlanRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        var updatedCredits = await _creditsService.UpgradePlanAsync(userId, request.Plan, cancellationToken);
        return Ok(ApiResponse<UserCredit>.Ok(updatedCredits));
    }

    /// <summary>
    /// Gets available subscription plans.
    /// </summary>
    [HttpGet("plans")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<System.Collections.Generic.List<SubscriptionPlanDetail>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPlans(CancellationToken cancellationToken)
    {
        var plans = await _creditsService.GetPlansAsync(cancellationToken);
        return Ok(ApiResponse<System.Collections.Generic.List<SubscriptionPlanDetail>>.Ok(plans));
    }

    /// <summary>Satın alınabilir tek seferlik kredi paketlerini döner.</summary>
    [HttpGet("packages")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<System.Collections.Generic.List<CreditPackage>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPackages(CancellationToken cancellationToken)
    {
        var packages = await _creditsService.GetPackagesAsync(cancellationToken);
        return Ok(ApiResponse<System.Collections.Generic.List<CreditPackage>>.Ok(packages));
    }

    /// <summary>Kredi paketi satın alımı: paket kredisi bakiyeye eklenir.</summary>
    [HttpPost("topup")]
    [ProducesResponseType(typeof(ApiResponse<UserCredit>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> TopUp([FromBody] TopUpRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail(Messages.Auth.Unauthorized));
        }

        if (request == null || string.IsNullOrWhiteSpace(request.PackageId))
        {
            return BadRequest(ApiResponse.Fail(Messages.Common.MissingRequestData));
        }

        var updated = await _creditsService.TopUpAsync(userId, request.PackageId, cancellationToken);
        var package = SubscriptionPlanCatalog.FindPackage(request.PackageId);
        return Ok(new ApiResponse<UserCredit>(updated, $"{package!.Credits} kredi hesabınıza eklendi!"));
    }
}
