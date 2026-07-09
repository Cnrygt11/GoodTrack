using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.Tasks;
using MediatR;
using GoodTrack.API.DTOs.Feedback;
using GoodTrack.API.DTOs.Common;
using GoodTrack.API.Features.Feedbacks.SubmitFeedback;
using Microsoft.AspNetCore.Http;

namespace GoodTrack.API.Controllers;

[Authorize]
[EnableRateLimiting("api-general")]
public class FeedbackController : BaseApiController
{
    private readonly IMediator _mediator;

    public FeedbackController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Submits user feedback using CQRS Command.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SubmitFeedback([FromBody] FeedbackInputDto input)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim. / Unauthorized."));
        }

        var command = new SubmitFeedbackCommand(userId, input.Title, input.Message, input.BrowserInfo);
        var result = await _mediator.Send(command);
        return Ok(result);
    }
}
