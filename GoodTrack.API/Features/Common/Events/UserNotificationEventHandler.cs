using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Hubs;

namespace GoodTrack.API.Features.Common.Events;

public sealed class UserNotificationEventHandler : INotificationHandler<UserNotificationEvent>
{
    private readonly IHubContext<TrackingHub> _hubContext;
    private readonly ILogger<UserNotificationEventHandler> _logger;

    public UserNotificationEventHandler(IHubContext<TrackingHub> hubContext, ILogger<UserNotificationEventHandler> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task Handle(UserNotificationEvent notification, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Sending SignalR notification using method {Method} to users: {Users}", notification.Method, string.Join(", ", notification.UserIds));
            foreach (var userId in notification.UserIds)
            {
                if (!string.IsNullOrEmpty(userId))
                {
                    await _hubContext.Clients.User(userId).SendAsync(notification.Method, cancellationToken);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send SignalR notification using method {Method}", notification.Method);
        }
    }
}
