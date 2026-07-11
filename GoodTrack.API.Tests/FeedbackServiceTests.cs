using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Xunit;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Constants;
using GoodTrack.API.Models;
using GoodTrack.API.Services;

namespace GoodTrack.API.Tests;

public class FeedbackServiceTests
{
    private readonly Mock<IFeedbackRepository> _feedbackRepositoryMock;
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly FeedbackService _feedbackService;

    public FeedbackServiceTests()
    {
        _feedbackRepositoryMock = new Mock<IFeedbackRepository>();
        _userRepositoryMock = new Mock<IUserRepository>();
        _feedbackService = new FeedbackService(_feedbackRepositoryMock.Object, _userRepositoryMock.Object);
    }

    [Fact]
    public async Task SubmitFeedbackAsync_UserExists_ShouldSaveFeedbackWithUserDetails()
    {
        // Arrange
        var user = new User { Id = "user-1", Username = "seller_one", Role = Roles.Seller };
        _userRepositoryMock
            .Setup(r => r.GetByIdAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        Feedback? saved = null;
        _feedbackRepositoryMock
            .Setup(r => r.SaveAsync(It.IsAny<Feedback>(), It.IsAny<CancellationToken>()))
            .Callback<Feedback, CancellationToken>((f, _) => saved = f)
            .Returns(Task.CompletedTask);

        // Act
        var message = await _feedbackService.SubmitFeedbackAsync("user-1", "Başlık", "Mesaj", "Chrome");

        // Assert
        message.Should().NotBeNullOrWhiteSpace();
        saved.Should().NotBeNull();
        saved!.UserId.Should().Be("user-1");
        saved.Username.Should().Be("seller_one");
        saved.Role.Should().Be(Roles.Seller);
        saved.Title.Should().Be("Başlık");
        saved.Message.Should().Be("Mesaj");
        saved.BrowserInfo.Should().Be("Chrome");
        // Not: Id'yi servis değil repository üretir (bkz. PostgresFeedbackRepository.SaveAsync).
        // Repository burada mock'landığı için Id doğal olarak boştur; bu davranış
        // FeedbackRepositoryTests içinde gerçek repository ile doğrulanır.
    }

    [Fact]
    public async Task SubmitFeedbackAsync_UserNotFound_ShouldThrowKeyNotFound()
    {
        // Arrange
        _userRepositoryMock
            .Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        // Act & Assert
        var act = () => _feedbackService.SubmitFeedbackAsync("missing", "t", "m", null);
        await act.Should().ThrowAsync<KeyNotFoundException>();

        _feedbackRepositoryMock.Verify(r => r.SaveAsync(It.IsAny<Feedback>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
