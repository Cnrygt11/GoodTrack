using MediatR;
using GoodTrack.API.Models;
using GoodTrack.API.DTOs.Common;

namespace GoodTrack.API.Features.Credits;

public sealed record UpgradePlanCommand(string UserId, string Plan) : IRequest<ApiResponse<UserCredit>>;
