using System;
using System.IO;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using GoodTrack.API.Middlewares;

namespace GoodTrack.API.Tests;

public class ExceptionHandlingMiddlewareTests
{
    private readonly Mock<ILogger<ExceptionHandlingMiddleware>> _loggerMock;

    public ExceptionHandlingMiddlewareTests()
    {
        _loggerMock = new Mock<ILogger<ExceptionHandlingMiddleware>>();
    }

    [Fact]
    public async Task InvokeAsync_ArgumentException_ShouldReturn400AndCustomMessage()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        RequestDelegate next = (ctx) => throw new ArgumentException("Geçersiz argüman");
        var middleware = new ExceptionHandlingMiddleware(next, _loggerMock.Object);

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be(400);
        context.Response.ContentType.Should().Be("application/json");

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var responseText = await reader.ReadToEndAsync();
        var responseJson = JsonSerializer.Deserialize<JsonElement>(responseText);

        responseJson.GetProperty("message").GetString().Should().Be("Geçersiz argüman");
        // Error body follows the same ApiResponse shape as controllers (success:false)
        responseJson.GetProperty("success").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task InvokeAsync_FrameworkInvalidOperationException_ShouldReturn500AndGenericMessage()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var ex = new InvalidOperationException("EF translation failed");
        ex.Source = "Microsoft.EntityFrameworkCore";

        RequestDelegate next = (ctx) => throw ex;
        var middleware = new ExceptionHandlingMiddleware(next, _loggerMock.Object);

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be(500);
        context.Response.ContentType.Should().Be("application/json");

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var responseText = await reader.ReadToEndAsync();
        var responseJson = JsonSerializer.Deserialize<JsonElement>(responseText);

        responseJson.GetProperty("message").GetString().Should().Be("Sunucuda beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.");
    }

    [Fact]
    public async Task InvokeAsync_BusinessInvalidOperationException_ShouldReturn400AndCustomMessage()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var ex = new InvalidOperationException("İş kuralı hatası");
        ex.Source = "GoodTrack.API";

        RequestDelegate next = (ctx) => throw ex;
        var middleware = new ExceptionHandlingMiddleware(next, _loggerMock.Object);

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be(400);
        context.Response.ContentType.Should().Be("application/json");

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var responseText = await reader.ReadToEndAsync();
        var responseJson = JsonSerializer.Deserialize<JsonElement>(responseText);

        responseJson.GetProperty("message").GetString().Should().Be("İş kuralı hatası");
    }
}
