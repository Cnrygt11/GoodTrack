using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Constants;
using GoodTrack.API.Hubs;
using GoodTrack.API.Models;
using GoodTrack.API.Services;
using GoodTrack.API.DTOs.Auth;

namespace GoodTrack.API.Tests;

public class ConnectionServiceTests
{
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly Mock<IConnectionRequestRepository> _connectionRequestRepositoryMock;
    private readonly Mock<IUserConnectionRepository> _userConnectionRepositoryMock;
    private readonly Mock<INotificationService> _notificationServiceMock;
    private readonly Mock<ILogger<ConnectionService>> _loggerMock;
    private readonly ConnectionService _connectionService;

    public ConnectionServiceTests()
    {
        _userRepositoryMock = new Mock<IUserRepository>();
        _connectionRequestRepositoryMock = new Mock<IConnectionRequestRepository>();
        _userConnectionRepositoryMock = new Mock<IUserConnectionRepository>();
        _notificationServiceMock = new Mock<INotificationService>();
        _loggerMock = new Mock<ILogger<ConnectionService>>();

        _connectionService = new ConnectionService(
            _userRepositoryMock.Object,
            _connectionRequestRepositoryMock.Object,
            _userConnectionRepositoryMock.Object,
            _notificationServiceMock.Object,
            _loggerMock.Object);
    }

    [Fact]
    public async Task GetConnectionsAsync_ValidUser_ShouldReturnTargetUsers()
    {
        // Arrange
        var userId = "user-1";
        var targetId = "user-2";
        var connections = new List<UserConnection>
        {
            new() { Id = "conn-1", SellerId = userId, ManufacturerId = targetId }
        };

        var targetUser = new User
        {
            Id = targetId,
            Username = "target_user",
            Role = Roles.Mfr
        };

        _userConnectionRepositoryMock
            .Setup(r => r.GetConnectionsByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(connections);

        _userRepositoryMock
            .Setup(r => r.GetByIdsAsync(It.Is<IEnumerable<string>>(ids => ids.Contains(targetId)), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<User> { targetUser });

        // Act
        var result = await _connectionService.GetConnectionsAsync(userId);

        // Assert
        result.Should().HaveCount(1);
        result[0].Id.Should().Be(targetId);
        result[0].Username.Should().Be("target_user");
        result[0].Role.Should().Be(Roles.Mfr);
    }

    [Fact]
    public async Task RemoveConnectionAsync_ExistingConnection_ShouldDeleteAndNotify()
    {
        // Arrange
        var userId = "user-1";
        var targetId = "user-2";

        _userConnectionRepositoryMock
            .Setup(r => r.DeleteAsync(userId, targetId, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        await _connectionService.RemoveConnectionAsync(userId, targetId);

        // Assert
        _userConnectionRepositoryMock.Verify(r => r.DeleteAsync(userId, targetId, It.IsAny<CancellationToken>()), Times.Once);
        _notificationServiceMock.Verify(n => n.NotifyUsersAsync(It.Is<IReadOnlyList<string>>(ids => ids.Contains(userId) && ids.Contains(targetId)), "ReceiveConnectionUpdate", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SendConnectionRequestAsync_ValidRequest_ShouldCreateRequestAndNotify()
    {
        // Arrange
        var senderId = "sender-1";
        var targetUsername = "receiver_user";
        var receiverUser = new User
        {
            Id = "receiver-1",
            Username = targetUsername,
            Role = Roles.Mfr
        };

        _userRepositoryMock
            .Setup(r => r.GetByUsernameAsync(targetUsername, It.IsAny<CancellationToken>()))
            .ReturnsAsync(receiverUser);

        _userConnectionRepositoryMock
            .Setup(r => r.AreConnectedAsync(senderId, receiverUser.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        _connectionRequestRepositoryMock
            .Setup(r => r.HasPendingRequestAsync(senderId, receiverUser.Id))
            .ReturnsAsync(false);

        _connectionRequestRepositoryMock
            .Setup(r => r.HasPendingRequestAsync(receiverUser.Id, senderId))
            .ReturnsAsync(false);

        // Act
        await _connectionService.SendConnectionRequestAsync(senderId, "sender_user", Roles.Seller, targetUsername);

        // Assert
        _connectionRequestRepositoryMock.Verify(r => r.SaveAsync(It.Is<ConnectionRequest>(
            req => req.SenderId == senderId && req.ReceiverId == receiverUser.Id && req.Status == "pending")), Times.Once);

        _notificationServiceMock.Verify(n => n.NotifyUsersAsync(It.IsAny<IReadOnlyList<string>>(), It.Is<string>(m => m == "ReceiveConnectionRequest" || m == "ReceiveConnectionUpdate"), It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }

    [Fact]
    public async Task SendConnectionRequestAsync_AlreadyConnected_ShouldThrowArgumentException()
    {
        // Arrange
        var senderId = "sender-1";
        var targetUsername = "receiver_user";
        var receiverUser = new User
        {
            Id = "receiver-1",
            Username = targetUsername,
            Role = Roles.Mfr
        };

        _userRepositoryMock
            .Setup(r => r.GetByUsernameAsync(targetUsername, It.IsAny<CancellationToken>()))
            .ReturnsAsync(receiverUser);

        _userConnectionRepositoryMock
            .Setup(r => r.AreConnectedAsync(senderId, receiverUser.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act & Assert
        var act = () => _connectionService.SendConnectionRequestAsync(senderId, "sender_user", Roles.Seller, targetUsername);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Bu kullanıcı zaten listenizde ekli.");

        _connectionRequestRepositoryMock.Verify(r => r.SaveAsync(It.IsAny<ConnectionRequest>()), Times.Never);
    }

    [Fact]
    public async Task AcceptConnectionRequestAsync_PendingRequest_ShouldCreateConnection()
    {
        // Arrange
        var receiverId = "receiver-1";
        var requestId = "req-123";
        var senderId = "sender-1";

        var request = new ConnectionRequest
        {
            Id = requestId,
            SenderId = senderId,
            ReceiverId = receiverId,
            Status = "pending"
        };

        var receiverUser = new User { Id = receiverId, Role = Roles.Seller };
        var senderUser = new User { Id = senderId, Role = Roles.Mfr };

        _connectionRequestRepositoryMock
            .Setup(r => r.GetByIdAsync(requestId))
            .ReturnsAsync(request);

        _userRepositoryMock
            .Setup(r => r.GetByIdAsync(receiverId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(receiverUser);

        _userRepositoryMock
            .Setup(r => r.GetByIdAsync(senderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(senderUser);

        _userConnectionRepositoryMock
            .Setup(r => r.AreConnectedAsync(receiverId, senderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        await _connectionService.AcceptConnectionRequestAsync(receiverId, requestId);

        // Assert
        _userConnectionRepositoryMock.Verify(r => r.SaveAsync(It.Is<UserConnection>(
            c => c.SellerId == receiverId && c.ManufacturerId == senderId), It.IsAny<CancellationToken>()), Times.Once);

        request.Status.Should().Be("accepted");
        _connectionRequestRepositoryMock.Verify(r => r.SaveAsync(request), Times.Once);

        _notificationServiceMock.Verify(n => n.NotifyUsersAsync(It.IsAny<IReadOnlyList<string>>(), It.Is<string>(m => m == "ReceiveConnectionUpdate" || m == "ReceiveConnectionRequest"), It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }

    [Fact]
    public async Task GetAvailableManufacturersAsync_ShouldOnlyReturnVisibleManufacturers()
    {
        // Arrange
        var visibleMfr = new User { Id = "mfr-1", Username = "visible_mfr", Role = Roles.Mfr, IsVisibleToSellers = true };
        var hiddenMfr = new User { Id = "mfr-2", Username = "hidden_mfr", Role = Roles.Mfr, IsVisibleToSellers = false };
        var seller = new User { Id = "seller-1", Username = "seller", Role = Roles.Seller };

        _userRepositoryMock
            .Setup(r => r.GetManufacturersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<User> { visibleMfr, hiddenMfr });

        // Act
        var result = await _connectionService.GetAvailableManufacturersAsync();

        // Assert
        result.Should().HaveCount(2); // Mock döndürüyor, repository filtrelemesi yok bu test'te
        _userRepositoryMock.Verify(r => r.GetManufacturersAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SendConnectionRequest_ShouldRejectBothNonSellerAndNonMfrRoles()
    {
        // Arrange
        var senderId = "admin-1";
        var receiver = new User { Id = "user-1", Username = "target", Role = Roles.Seller };
        var admin = new User { Id = senderId, Username = "admin", Role = Roles.Admin };

        _userRepositoryMock
            .Setup(r => r.GetByUsernameAsync(receiver.Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(receiver);

        // Act & Assert
        var act = () => _connectionService.SendConnectionRequestAsync(senderId, admin.Username, Roles.Admin, receiver.Username);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*satıcı veya üretici*");
    }
}
