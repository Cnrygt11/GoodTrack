using MediatR;
using GoodTrack.API.DTOs.Common;

namespace GoodTrack.API.Features.Feedbacks.SubmitFeedback;

public sealed record SubmitFeedbackCommand(
    string UserId,
    string Title,
    string Message,
    string? BrowserInfo
) : IRequest<ApiResponse<string>>;
