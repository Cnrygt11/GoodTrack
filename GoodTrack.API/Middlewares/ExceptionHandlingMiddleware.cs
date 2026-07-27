using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GoodTrack.API.DTOs.Common;
using GoodTrack.API.Models;

namespace GoodTrack.API.Middlewares;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            if (ex is UnauthorizedAccessException || ex is ArgumentException || ex is KeyNotFoundException || ex is BusinessRuleException || ex is InsufficientCreditsException)
            {
                _logger.LogWarning("Client request error at {Path}: {Message}", context.Request.Path, ex.Message);
            }
            else
            {
                _logger.LogError(ex, "Unhandled exception occurred during request to {Path}", context.Request.Path);
            }
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var statusCode = HttpStatusCode.InternalServerError;
        var message = "Sunucuda beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.";

        switch (exception)
        {
            case KeyNotFoundException:
                statusCode = HttpStatusCode.NotFound;
                message = exception.Message;
                break;
            case UnauthorizedAccessException:
                statusCode = HttpStatusCode.Forbidden;
                message = exception.Message;
                break;
            case ArgumentException:
                statusCode = HttpStatusCode.BadRequest;
                message = exception.Message;
                break;
            case BusinessRuleException:
                statusCode = HttpStatusCode.BadRequest;
                message = exception.Message;
                break;
            case InsufficientCreditsException:
                statusCode = HttpStatusCode.PaymentRequired;
                message = exception.Message;
                break;
            case DbUpdateConcurrencyException:
                statusCode = HttpStatusCode.Conflict;
                message = "İşlem sırasında eşzamanlılık çakışması oluştu. Lütfen tekrar deneyiniz.";
                break;
        }

        context.Response.StatusCode = (int)statusCode;

        // Hata gövdesini de controller'lardaki başarı yanıtlarıyla aynı ApiResponse
        // şekline sok ({ success:false, message }). Böylece frontend'in envelope
        // çözümleyicisi (success alanına bakar) bunu doğru şekilde hata olarak algılar.
        var payload = JsonSerializer.Serialize(
            ApiResponse.Fail(message),
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        return context.Response.WriteAsync(payload);
    }
}
