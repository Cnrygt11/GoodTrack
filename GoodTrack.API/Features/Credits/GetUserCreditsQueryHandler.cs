using System.Threading;
using System.Threading.Tasks;
using MediatR;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Models;
using GoodTrack.API.DTOs.Common;

namespace GoodTrack.API.Features.Credits;

public sealed class GetUserCreditsQueryHandler : IRequestHandler<GetUserCreditsQuery, ApiResponse<UserCredit>>
{
    private readonly ICreditsService _creditsService;

    public GetUserCreditsQueryHandler(ICreditsService creditsService)
    {
        _creditsService = creditsService;
    }

    public async Task<ApiResponse<UserCredit>> Handle(GetUserCreditsQuery request, CancellationToken cancellationToken)
    {
        var credits = await _creditsService.GetOrCreateCreditsAsync(request.UserId, cancellationToken);
        return ApiResponse<UserCredit>.Ok(credits);
    }
}
