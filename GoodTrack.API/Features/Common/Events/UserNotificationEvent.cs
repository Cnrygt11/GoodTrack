using MediatR;
using System.Collections.Generic;

namespace GoodTrack.API.Features.Common.Events;

public sealed record UserNotificationEvent(IReadOnlyList<string> UserIds, string Method) : INotification;
