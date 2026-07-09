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

using MediatR;
using GoodTrack.API.Features.Common.Events;

namespace GoodTrack.API.Services;

public sealed class ConnectionService : IConnectionService
{
    private readonly IUserRepository _userRepository;
    private readonly IConnectionRequestRepository _connectionRequestRepository;
    private readonly IUserConnectionRepository _userConnectionRepository;
    private readonly IMediator _mediator;
    private readonly ILogger<ConnectionService> _logger;

    public ConnectionService(
        IUserRepository userRepository,
        IConnectionRequestRepository connectionRequestRepository,
        IUserConnectionRepository userConnectionRepository,
        IMediator mediator,
        ILogger<ConnectionService> logger)
    {
        _userRepository = userRepository;
        _connectionRequestRepository = connectionRequestRepository;
        _userConnectionRepository = userConnectionRepository;
        _mediator = mediator;
        _logger = logger;
    }

    public async Task<List<UserDto>> GetConnectionsAsync(string userId)
    {
        var connections = await _userConnectionRepository.GetConnectionsByUserIdAsync(userId);
        if (connections.Count == 0)
        {
            return new List<UserDto>();
        }

        var targetIds = connections
            .Select(c => c.SellerId == userId ? c.ManufacturerId : c.SellerId)
            .Distinct()
            .ToList();

        // Tek toplu sorgu ile tüm bağlantı hedeflerini çek (N+1 sorgusundan kaçınmak için).
        var targets = await _userRepository.GetByIdsAsync(targetIds);

        return targets
            .Select(t => new UserDto { Id = t.Id, Username = t.Username, Role = t.Role })
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

        // Bağlantı yalnızca bir satıcı ile bir üretici arasında kurulabilir.
        if (senderRole != Roles.Seller && senderRole != Roles.Mfr)
        {
            throw new ArgumentException("Yalnızca satıcı veya üretici hesapları bağlantı kurabilir.");
        }

        if (receiver.Role != Roles.Seller && receiver.Role != Roles.Mfr)
        {
            throw new ArgumentException("Yalnızca satıcı veya üretici hesaplarına bağlantı isteği gönderebilirsiniz.");
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
            Status = ConnectionRequestStatus.Pending,
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

        if (request.Status != ConnectionRequestStatus.Pending)
        {
            throw new ArgumentException("İstek zaten işlenmiş.");
        }

        var user = await _userRepository.GetByIdAsync(receiverId);
        var sender = await _userRepository.GetByIdAsync(request.SenderId);

        if (user == null || sender == null)
        {
            throw new KeyNotFoundException("Kullanıcılardan biri bulunamadı.");
        }

        // Katılımcıların tam olarak bir satıcı ve bir üretici olduğunu doğrula;
        // aksi halde (örn. admin hesabı) kendi kendine bağlantı oluşmasını engelle.
        string sellerId;
        string mfrId;
        if (user.Role == Roles.Seller && sender.Role == Roles.Mfr)
        {
            sellerId = user.Id;
            mfrId = sender.Id;
        }
        else if (user.Role == Roles.Mfr && sender.Role == Roles.Seller)
        {
            sellerId = sender.Id;
            mfrId = user.Id;
        }
        else
        {
            throw new ArgumentException("Bağlantı yalnızca bir satıcı ile bir üretici arasında kurulabilir.");
        }

        var areConnected = await _userConnectionRepository.AreConnectedAsync(sellerId, mfrId);
        if (!areConnected)
        {
            await _userConnectionRepository.SaveAsync(new UserConnection
            {
                SellerId = sellerId,
                ManufacturerId = mfrId
            });
        }

        request.Status = ConnectionRequestStatus.Accepted;
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

        if (request.Status != ConnectionRequestStatus.Pending)
        {
            throw new ArgumentException("İstek zaten işlenmiş.");
        }

        request.Status = ConnectionRequestStatus.Rejected;
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
            await _mediator.Publish(new UserNotificationEvent(userIds, method));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "MediatR event-driven notification '{Method}' failed for users: {UserIds}", method, string.Join(", ", userIds));
        }
    }

    private async Task SafeNotifyUserAsync(string userId, string method)
    {
        try
        {
            await _mediator.Publish(new UserNotificationEvent(new[] { userId }, method));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "MediatR event-driven notification '{Method}' failed for user: {UserId}", method, userId);
        }
    }
}
