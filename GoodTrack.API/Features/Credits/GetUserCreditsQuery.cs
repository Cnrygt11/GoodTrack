using MediatR;
using GoodTrack.API.Models;
using GoodTrack.API.DTOs.Common;

namespace GoodTrack.API.Features.Credits;

public sealed record GetUserCreditsQuery(string UserId) : IRequest<ApiResponse<UserCredit>>;
