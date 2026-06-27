using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Constants;
using GoodTrack.API.DTOs.Auth;

namespace GoodTrack.API.Controllers;

[Authorize(Roles = Roles.Admin)]
[EnableRateLimiting("api-general")]
public class AdminController : BaseApiController
{
    private readonly IUserRepository _userRepository;
    private readonly IFeedbackRepository _feedbackRepository;
    private readonly ILogger<AdminController> _logger;

    public AdminController(
        IUserRepository userRepository,
        IFeedbackRepository feedbackRepository,
        ILogger<AdminController> logger)
    {
        _userRepository = userRepository;
        _feedbackRepository = feedbackRepository;
        _logger = logger;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var currentAdminId = GetCurrentUserId();
        _logger.LogInformation("Admin {AdminId} requested users list.", currentAdminId);

        var users = await _userRepository.GetAllUsersAsync();
        var response = users.Select(u => new UserAdminDto
        {
            Id = u.Id,
            Username = u.Username,
            Role = u.Role,
            FirstName = u.FirstName,
            LastName = u.LastName,
            Email = u.Email,
            PhoneNumber = u.PhoneNumber,
            ProfilePicture = u.ProfilePicture,
            Address = u.Address,
            City = u.City,
            Bio = u.Bio,
            ProductImages = u.ProductImages,
            Keywords = u.Keywords,
            IsVisibleToSellers = u.IsVisibleToSellers,
            CreatedAt = u.CreatedAt,
            AssociatedUserIds = new List<string>(),
            IsActive = u.IsActive
        }).ToList();

        return Ok(response);
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var currentAdminId = GetCurrentUserId();
        _logger.LogWarning("Admin {AdminId} is deleting user {UserId}.", currentAdminId, id);

        if (currentAdminId == id)
        {
            return BadRequest("Kendi yönetici hesabınızı silemezsiniz.");
        }

        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
        {
            return NotFound("Silinmek istenen kullanıcı bulunamadı.");
        }

        await _userRepository.DeleteUserAsync(id);
        return Ok(new { message = $"'{user.Username}' kullanıcısı başarıyla silindi." });
    }

    [HttpGet("feedbacks")]
    public async Task<IActionResult> GetFeedbacks()
    {
        var currentAdminId = GetCurrentUserId();
        _logger.LogInformation("Admin {AdminId} requested feedbacks list.", currentAdminId);

        var feedbacks = await _feedbackRepository.GetAllFeedbacksAsync();
        return Ok(feedbacks);
    }
}
