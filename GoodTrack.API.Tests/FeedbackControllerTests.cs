using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Controllers;
using GoodTrack.API.DTOs.Feedback;
using GoodTrack.API.DTOs.Common;
using System.Security.Claims;

namespace GoodTrack.API.Tests;

public class FeedbackControllerTests
{
    private readonly Mock<IFeedbackService> _feedbackServiceMock;
    private readonly FeedbackController _controller;

    public FeedbackControllerTests()
    {
        _feedbackServiceMock = new Mock<IFeedbackService>();
        _controller = new FeedbackController(_feedbackServiceMock.Object);

        // Mock User Claims (HttpContext yetkilendirme simülasyonu)
        var userClaims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "user-123")
        }, "mock"));

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = userClaims }
        };
    }

    [Fact]
    public async Task SubmitFeedback_ShouldCallServiceAndReturnOk()
    {
        // Arrange
        var input = new FeedbackInputDto
        {
            Title = "Hata Raporu",
            Message = "Etsy senkronizasyonu yarıda kesiliyor.",
            BrowserInfo = "Chrome/Windows"
        };

        _feedbackServiceMock
            .Setup(s => s.SubmitFeedbackAsync("user-123", input.Title, input.Message, input.BrowserInfo, It.IsAny<CancellationToken>()))
            .ReturnsAsync("Geri bildiriminiz başarıyla iletildi.");

        // Act
        var result = await _controller.SubmitFeedback(input, CancellationToken.None);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<string>>().Subject;
        apiResponse.Success.Should().BeTrue();

        _feedbackServiceMock.Verify(s => s.SubmitFeedbackAsync(
            "user-123", "Hata Raporu", "Etsy senkronizasyonu yarıda kesiliyor.", "Chrome/Windows",
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
