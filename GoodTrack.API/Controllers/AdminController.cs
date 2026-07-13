using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.Tasks;
using System.Linq;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Constants;
using GoodTrack.API.DTOs.Auth;
using GoodTrack.API.DTOs.Common;
using GoodTrack.API.Models;

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
            // Galeri (base64 dizisi) admin listesinde kullanılmıyor; ağır veriyi istemciye göndermemek
            // için boş bırakılır. (Not: admin nadir ve düşük frekanslı bir uç nokta olduğundan DB
            // okumasının projeksiyonu bu turda kapsam dışı; asıl yük olan istemci payload'u kesildi.)
            ProductImages = new List<string>(),
            Keywords = u.Keywords,
            IsVisibleToSellers = u.IsVisibleToSellers,
            CreatedAt = u.CreatedAt,
            AssociatedUserIds = new List<string>(),
            IsActive = u.IsActive
        }).ToList();

        return Ok(new ApiResponse<List<UserAdminDto>>(response));
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var currentAdminId = GetCurrentUserId();
        _logger.LogWarning("Admin {AdminId} is deleting user {UserId}.", currentAdminId, id);

        if (currentAdminId == id)
        {
            return BadRequest(ApiResponse.Fail("Kendi yönetici hesabınızı silemezsiniz."));
        }

        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
        {
            return NotFound(ApiResponse.Fail("Silinmek istenen kullanıcı bulunamadı."));
        }

        await _userRepository.DeleteUserAsync(id);
        return Ok(ApiResponse.Ok($"'{user.Username}' kullanıcısı başarıyla silindi."));
    }

    [HttpGet("feedbacks")]
    public async Task<IActionResult> GetFeedbacks()
    {
        var currentAdminId = GetCurrentUserId();
        _logger.LogInformation("Admin {AdminId} requested feedbacks list.", currentAdminId);

        var feedbacks = await _feedbackRepository.GetAllFeedbacksAsync();
        return Ok(new ApiResponse<List<Feedback>>(feedbacks));
    }
}
