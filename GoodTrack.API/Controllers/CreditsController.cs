using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;
using MediatR;
using GoodTrack.API.DTOs.Common;
using GoodTrack.API.DTOs.Credits;
using GoodTrack.API.Models;
using GoodTrack.API.Features.Credits;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Constants;
using System.Threading;

namespace GoodTrack.API.Controllers;

[Authorize(Roles = Roles.Seller)]
[EnableRateLimiting("api-general")]
public class CreditsController : BaseApiController
{
    private readonly IMediator _mediator;
    private readonly ICreditsService _creditsService;

    public CreditsController(IMediator mediator, ICreditsService creditsService)
    {
        _mediator = mediator;
        _creditsService = creditsService;
    }

    /// <summary>
    /// Gets current credits for the authenticated user using CQRS Query.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<UserCredit>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCredits()
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim. / Unauthorized."));
        }

        var query = new GetUserCreditsQuery(userId);
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// Upgrades the user plan using CQRS Command.
    /// </summary>
    [HttpPost("upgrade")]
    [ProducesResponseType(typeof(ApiResponse<UserCredit>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpgradePlan([FromBody] UpgradePlanRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim. / Unauthorized."));
        }

        var command = new UpgradePlanCommand(userId, request.Plan);
        var result = await _mediator.Send(command);
        return Ok(result);
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
}
