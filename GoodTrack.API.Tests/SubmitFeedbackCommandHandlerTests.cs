using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Xunit;
using GoodTrack.API.Features.Feedbacks.SubmitFeedback;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Models;

namespace GoodTrack.API.Tests;

public class SubmitFeedbackCommandHandlerTests
{
    private readonly Mock<IFeedbackRepository> _feedbackRepositoryMock;
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly SubmitFeedbackCommandHandler _handler;

    public SubmitFeedbackCommandHandlerTests()
    {
        _feedbackRepositoryMock = new Mock<IFeedbackRepository>();
        _userRepositoryMock = new Mock<IUserRepository>();
        _handler = new SubmitFeedbackCommandHandler(_feedbackRepositoryMock.Object, _userRepositoryMock.Object);
    }

    [Fact]
    public async Task Handle_UserExists_ShouldSaveFeedbackAndReturnOk()
    {
        // Arrange
        var command = new SubmitFeedbackCommand(
            "user-123",
            "Hata Raporu",
            "Etsy senkronizasyonu yarıda kesiliyor.",
            "Chrome/Windows"
        );

        var user = new User
        {
            Id = "user-123",
            Username = "test_user",
            Role = "Seller"
        };

        _userRepositoryMock.Setup(r => r.GetByIdAsync("user-123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        _feedbackRepositoryMock.Setup(r => r.SaveAsync(It.IsAny<Feedback>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().ContainEquivalentOf("teşekkür ederiz");

        _feedbackRepositoryMock.Verify(r => r.SaveAsync(It.Is<Feedback>(f =>
            f.UserId == "user-123" &&
            f.Title == "Hata Raporu" &&
            f.Message == "Etsy senkronizasyonu yarıda kesiliyor." &&
            f.BrowserInfo == "Chrome/Windows"
        ), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_UserDoesNotExist_ShouldThrowKeyNotFoundException()
    {
        // Arrange
        var command = new SubmitFeedbackCommand(
            "user-123",
            "Başlık",
            "Mesaj",
            null
        );

        _userRepositoryMock.Setup(r => r.GetByIdAsync("user-123", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        // Act
        Func<Task> act = async () => await _handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("Kullanıcı bulunamadı. / User not found.");
    }
}
