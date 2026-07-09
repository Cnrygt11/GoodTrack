using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Models;
using GoodTrack.API.DTOs.Common;

namespace GoodTrack.API.Features.Feedbacks.SubmitFeedback;

public sealed class SubmitFeedbackCommandHandler : IRequestHandler<SubmitFeedbackCommand, ApiResponse<string>>
{
    private readonly IFeedbackRepository _feedbackRepository;
    private readonly IUserRepository _userRepository;

    public SubmitFeedbackCommandHandler(IFeedbackRepository feedbackRepository, IUserRepository userRepository)
    {
        _feedbackRepository = feedbackRepository;
        _userRepository = userRepository;
    }

    public async Task<ApiResponse<string>> Handle(SubmitFeedbackCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdAsync(request.UserId, cancellationToken);
        if (user is null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı. / User not found.");
        }

        var feedback = new Feedback
        {
            Id = Guid.NewGuid().ToString(),
            UserId = request.UserId,
            Username = user.Username,
            Role = user.Role,
            Title = request.Title,
            Message = request.Message,
            BrowserInfo = request.BrowserInfo ?? string.Empty,
            CreatedAt = DateTime.UtcNow.ToString("o")
        };

        await _feedbackRepository.SaveAsync(feedback, cancellationToken);

        return ApiResponse<string>.Ok("Geri bildiriminiz başarıyla iletildi. Teşekkür ederiz! / Feedback submitted successfully. Thank you!");
    }
}
