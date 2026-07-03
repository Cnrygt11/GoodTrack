using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Auth;
using GoodTrack.API.Models;
using GoodTrack.API.Hubs;
using GoodTrack.API.Constants;

namespace GoodTrack.API.Services;

public class ConnectionService : IConnectionService
{
    private readonly IUserRepository _userRepository;
    private readonly IConnectionRequestRepository _connectionRequestRepository;
    private readonly IUserConnectionRepository _userConnectionRepository;
    private readonly IHubContext<TrackingHub> _hubContext;
    private readonly ILogger<ConnectionService> _logger;

    public ConnectionService(
        IUserRepository userRepository,
        IConnectionRequestRepository connectionRequestRepository,
        IUserConnectionRepository userConnectionRepository,
        IHubContext<TrackingHub> hubContext,
        ILogger<ConnectionService> logger)
    {
        _userRepository = userRepository;
        _connectionRequestRepository = connectionRequestRepository;
        _userConnectionRepository = userConnectionRepository;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task<List<UserDto>> GetConnectionsAsync(string userId)
    {
        var connections = await _userConnectionRepository.GetConnectionsByUserIdAsync(userId);
        if (connections.Count == 0)
        {
            return new List<UserDto>();
        }

        var fetchTasks = connections
            .Select(c => c.SellerId == userId ? c.ManufacturerId : c.SellerId)
            .Select(id => _userRepository.GetByIdAsync(id))
            .ToList();

        var targets = await Task.WhenAll(fetchTasks);

        return targets
            .Where(t => t != null)
            .Select(t => new UserDto { Id = t!.Id, Username = t.Username, Role = t.Role })
            .ToList();
    }

    public async Task RemoveConnectionAsync(string userId, string targetId)
    {
        await _userConnectionRepository.DeleteAsync(userId, targetId);

        // Real-time notification: connection removed
        await SafeNotifyUsersAsync(new[] { userId, targetId }, "ReceiveConnectionUpdate");
    }

    public async Task<List<UserDto>> GetAvailableManufacturersAsync()
    {
        var mfrs = await _userRepository.GetManufacturersAsync();
        return mfrs.Select(u => new UserDto { Id = u.Id, Username = u.Username, Role = u.Role }).ToList();
    }

    public async Task SendConnectionRequestAsync(string senderId, string senderUsername, string senderRole, string targetUsername)
    {
        var receiver = await _userRepository.GetByUsernameAsync(targetUsername.Trim().ToLower());
        if (receiver == null)
        {
            throw new KeyNotFoundException("Kullanıcı bulunamadı!");
        }

        if (receiver.Id == senderId)
        {
            throw new ArgumentException("Kendinize bağlantı isteği gönderemezsiniz.");
        }

        if (receiver.Role == senderRole)
        {
            var oppositeRoleText = (senderRole == Roles.Seller) ? "üretici" : "satıcı";
            throw new ArgumentException($"Sadece {oppositeRoleText} ekleyebilirsiniz.");
        }

        var areConnected = await _userConnectionRepository.AreConnectedAsync(senderId, receiver.Id);
        if (areConnected)
        {
            throw new ArgumentException("Bu kullanıcı zaten listenizde ekli.");
        }

        var isPendingFromSender = await _connectionRequestRepository.HasPendingRequestAsync(senderId, receiver.Id);
        if (isPendingFromSender)
        {
            throw new ArgumentException("Bu kullanıcıya zaten beklemede olan bir bağlantı isteği gönderdiniz.");
        }

        var isPendingFromReceiver = await _connectionRequestRepository.HasPendingRequestAsync(receiver.Id, senderId);
        if (isPendingFromReceiver)
        {
            throw new ArgumentException("Bu kullanıcıdan size zaten gelen bir bağlantı isteği var. Lütfen gelen istekler bölümünden kabul edin.");
        }

        var connectionRequest = new ConnectionRequest
        {
            SenderId = senderId,
            SenderUsername = senderUsername,
            ReceiverId = receiver.Id,
            ReceiverUsername = receiver.Username,
            Status = "pending",
            CreatedAt = DateTime.UtcNow.ToString("o")
        };

        await _connectionRequestRepository.SaveAsync(connectionRequest);

        // Real-time notification: connection request sent
        await SafeNotifyUserAsync(receiver.Id, "ReceiveConnectionRequest");
        await SafeNotifyUserAsync(senderId, "ReceiveConnectionRequest");
    }

    public async Task<List<ConnectionRequestDto>> GetIncomingRequestsAsync(string receiverId)
    {
        var requests = await _connectionRequestRepository.GetIncomingPendingRequestsAsync(receiverId);
        return requests.Select(MapToConnectionRequestDto).ToList();
    }

    public async Task<List<ConnectionRequestDto>> GetSentRequestsAsync(string senderId)
    {
        var requests = await _connectionRequestRepository.GetSentRequestsAsync(senderId);
        return requests.Select(MapToConnectionRequestDto).ToList();
    }

    public async Task AcceptConnectionRequestAsync(string receiverId, string requestId)
    {
        var request = await _connectionRequestRepository.GetByIdAsync(requestId);
        if (request == null)
        {
            throw new KeyNotFoundException("Bağlantı isteği bulunamadı.");
        }

        if (request.ReceiverId != receiverId)
        {
            throw new UnauthorizedAccessException("Bu isteği kabul etme yetkiniz yok.");
        }

        if (request.Status != "pending")
        {
            throw new ArgumentException("İstek zaten işlenmiş.");
        }

        var user = await _userRepository.GetByIdAsync(receiverId);
        var sender = await _userRepository.GetByIdAsync(request.SenderId);

        if (user == null || sender == null)
        {
            throw new KeyNotFoundException("Kullanıcılardan biri bulunamadı.");
        }

        var sellerId = user.Role == Roles.Seller ? user.Id : sender.Id;
        var mfrId = user.Role == Roles.Mfr ? user.Id : sender.Id;

        var areConnected = await _userConnectionRepository.AreConnectedAsync(sellerId, mfrId);
        if (!areConnected)
        {
            await _userConnectionRepository.SaveAsync(new UserConnection
            {
                SellerId = sellerId,
                ManufacturerId = mfrId
            });
        }

        request.Status = "accepted";
        await _connectionRequestRepository.SaveAsync(request);

        // Real-time notification: connection request accepted (update both connections list and requests list)
        await SafeNotifyUsersAsync(new[] { receiverId, request.SenderId }, "ReceiveConnectionUpdate");
        await SafeNotifyUsersAsync(new[] { receiverId, request.SenderId }, "ReceiveConnectionRequest");
    }

    public async Task RejectConnectionRequestAsync(string receiverId, string requestId)
    {
        var request = await _connectionRequestRepository.GetByIdAsync(requestId);
        if (request == null)
        {
            throw new KeyNotFoundException("Bağlantı isteği bulunamadı.");
        }

        if (request.ReceiverId != receiverId)
        {
            throw new UnauthorizedAccessException("Bu isteği reddetme yetkiniz yok.");
        }

        if (request.Status != "pending")
        {
            throw new ArgumentException("İstek zaten işlenmiş.");
        }

        request.Status = "rejected";
        await _connectionRequestRepository.SaveAsync(request);

        // Real-time notification: connection request rejected
        await SafeNotifyUsersAsync(new[] { receiverId, request.SenderId }, "ReceiveConnectionRequest");
    }

    public async Task DeleteConnectionRequestAsync(string userId, string requestId)
    {
        var request = await _connectionRequestRepository.GetByIdAsync(requestId);
        if (request == null)
        {
            throw new KeyNotFoundException("Bağlantı isteği bulunamadı.");
        }

        if (request.SenderId != userId && request.ReceiverId != userId)
        {
            throw new UnauthorizedAccessException("Bu isteği silme yetkiniz yok.");
        }

        await _connectionRequestRepository.DeleteAsync(requestId);

        // Real-time notification: connection request log deleted
        await SafeNotifyUserAsync(userId, "ReceiveConnectionRequest");
    }

    private static ConnectionRequestDto MapToConnectionRequestDto(ConnectionRequest r) => new()
    {
        Id = r.Id,
        SenderId = r.SenderId,
        SenderUsername = r.SenderUsername,
        ReceiverId = r.ReceiverId,
        ReceiverUsername = r.ReceiverUsername,
        Status = r.Status,
        CreatedAt = r.CreatedAt
    };

    private async Task SafeNotifyUsersAsync(IReadOnlyList<string> userIds, string method)
    {
        try
        {
            await _hubContext.Clients.Users(userIds).SendAsync(method);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SignalR notification '{Method}' failed for users: {UserIds}", method, string.Join(", ", userIds));
        }
    }

    private async Task SafeNotifyUserAsync(string userId, string method)
    {
        try
        {
            await _hubContext.Clients.User(userId).SendAsync(method);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SignalR notification '{Method}' failed for user: {UserId}", method, userId);
        }
    }
}
