using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Hubs;

namespace GoodTrack.API.Services;

/// <summary>
/// <see cref="INotificationService"/>'in SignalR uygulaması. Daha önce MediatR
/// UserNotificationEvent + handler ile yapılan iş buraya taşındı.
/// </summary>
public sealed class SignalRNotificationService : INotificationService
{
    private readonly IHubContext<TrackingHub> _hubContext;
    private readonly ILogger<SignalRNotificationService> _logger;

    public SignalRNotificationService(IHubContext<TrackingHub> hubContext, ILogger<SignalRNotificationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyUsersAsync(IReadOnlyList<string> userIds, string method, object? payload = null, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Sending SignalR notification using method {Method} to users: {Users}", method, string.Join(", ", userIds));
            foreach (var userId in userIds)
            {
                if (!string.IsNullOrEmpty(userId))
                {
                    if (payload != null)
                    {
                        await _hubContext.Clients.User(userId).SendAsync(method, payload, cancellationToken);
                    }
                    else
                    {
                        await _hubContext.Clients.User(userId).SendAsync(method, cancellationToken);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send SignalR notification using method {Method}", method);
        }
    }
}
