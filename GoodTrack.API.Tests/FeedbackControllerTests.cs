using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;
using GoodTrack.API.Controllers;
using GoodTrack.API.DTOs.Feedback;
using GoodTrack.API.DTOs.Common;
using System.Security.Claims;
using MediatR;
using GoodTrack.API.Features.Feedbacks.SubmitFeedback;

namespace GoodTrack.API.Tests;

public class FeedbackControllerTests
{
    private readonly Mock<IMediator> _mediatorMock;
    private readonly FeedbackController _controller;

    public FeedbackControllerTests()
    {
        _mediatorMock = new Mock<IMediator>();
        _controller = new FeedbackController(_mediatorMock.Object);

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
    public async Task SubmitFeedback_ShouldSendCommandAndReturnOk()
    {
        // Arrange
        var input = new FeedbackInputDto
        {
            Title = "Hata Raporu",
            Message = "Etsy senkronizasyonu yarıda kesiliyor.",
            BrowserInfo = "Chrome/Windows"
        };

        var expectedResponse = ApiResponse<string>.Ok("Geri bildiriminiz başarıyla iletildi.");

        _mediatorMock.Setup(m => m.Send(It.IsAny<SubmitFeedbackCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResponse);

        // Act
        var result = await _controller.SubmitFeedback(input);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<string>>().Subject;
        apiResponse.Success.Should().BeTrue();
        
        _mediatorMock.Verify(m => m.Send(It.Is<SubmitFeedbackCommand>(c => 
            c.UserId == "user-123" &&
            c.Title == "Hata Raporu" &&
            c.Message == "Etsy senkronizasyonu yarıda kesiliyor." &&
            c.BrowserInfo == "Chrome/Windows"
        ), It.IsAny<CancellationToken>()), Times.Once);
    }
}
