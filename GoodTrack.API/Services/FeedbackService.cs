using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Models;

namespace GoodTrack.API.Services;

public sealed class FeedbackService : IFeedbackService
{
    private readonly IFeedbackRepository _feedbackRepository;
    private readonly IUserRepository _userRepository;

    public FeedbackService(IFeedbackRepository feedbackRepository, IUserRepository userRepository)
    {
        _feedbackRepository = feedbackRepository;
        _userRepository = userRepository;
    }

    public async Task<string> SubmitFeedbackAsync(string userId, string title, string message, string? browserInfo, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException("Kullanıcı bulunamadı. / User not found.");

        var feedback = new Feedback
        {
            UserId = userId,
            Username = user.Username,
            Role = user.Role,
            Title = title,
            Message = message,
            BrowserInfo = browserInfo ?? string.Empty,
            CreatedAt = DateTime.UtcNow.ToString("o")
        };

        await _feedbackRepository.SaveAsync(feedback, cancellationToken);

        return "Geri bildiriminiz başarıyla iletildi. Teşekkür ederiz! / Feedback submitted successfully. Thank you!";
    }
}
