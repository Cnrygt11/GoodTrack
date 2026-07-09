using System.Threading;
using System.Threading.Tasks;
using MediatR;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Models;
using GoodTrack.API.DTOs.Common;

namespace GoodTrack.API.Features.Credits;

public sealed class UpgradePlanCommandHandler : IRequestHandler<UpgradePlanCommand, ApiResponse<UserCredit>>
{
    private readonly ICreditsService _creditsService;

    public UpgradePlanCommandHandler(ICreditsService creditsService)
    {
        _creditsService = creditsService;
    }

    public async Task<ApiResponse<UserCredit>> Handle(UpgradePlanCommand request, CancellationToken cancellationToken)
    {
        var updatedCredits = await _creditsService.UpgradePlanAsync(request.UserId, request.Plan, cancellationToken);
        return ApiResponse<UserCredit>.Ok(updatedCredits);
    }
}
