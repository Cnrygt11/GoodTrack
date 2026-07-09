using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading;
using System.Threading.Tasks;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Feedback;
using GoodTrack.API.DTOs.Common;
using Microsoft.AspNetCore.Http;

namespace GoodTrack.API.Controllers;

[Authorize]
[EnableRateLimiting("api-general")]
public class FeedbackController : BaseApiController
{
    private readonly IFeedbackService _feedbackService;

    public FeedbackController(IFeedbackService feedbackService)
    {
        _feedbackService = feedbackService;
    }

    /// <summary>
    /// Submits user feedback.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SubmitFeedback([FromBody] FeedbackInputDto input, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(ApiResponse.Fail("Yetkisiz erişim. / Unauthorized."));
        }

        var message = await _feedbackService.SubmitFeedbackAsync(userId, input.Title, input.Message, input.BrowserInfo, cancellationToken);
        return Ok(ApiResponse<string>.Ok(message));
    }
}
