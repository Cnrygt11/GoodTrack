using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using System.Threading.Tasks;
using System;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Models;

namespace GoodTrack.API.Controllers;

[Authorize]
[EnableRateLimiting("api-general")]
public class FeedbackController : BaseApiController
{
    private readonly IFeedbackRepository _feedbackRepository;
    private readonly IUserRepository _userRepository;
    private readonly ILogger<FeedbackController> _logger;

    public FeedbackController(
        IFeedbackRepository feedbackRepository,
        IUserRepository userRepository,
        ILogger<FeedbackController> logger)
    {
        _feedbackRepository = feedbackRepository;
        _userRepository = userRepository;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> SubmitFeedback([FromBody] FeedbackInputDto input)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null)
        {
            return NotFound("Kullanıcı bulunamadı.");
        }

        var feedback = new Feedback
        {
            UserId = userId,
            Username = user.Username,
            Role = user.Role,
            Title = input.Title,
            Message = input.Message,
            BrowserInfo = input.BrowserInfo ?? string.Empty,
            CreatedAt = DateTime.UtcNow.ToString("o")
        };

        await _feedbackRepository.SaveAsync(feedback);

        return Ok(new { message = "Geri bildiriminiz başarıyla iletildi. Teşekkür ederiz!" });
    }
}

public class FeedbackInputDto
{
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? BrowserInfo { get; set; }
}
