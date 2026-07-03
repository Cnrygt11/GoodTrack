using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using MimeKit;
using MailKit.Net.Smtp;
using MailKit.Security;

namespace GoodTrack.API.Services;

public sealed class MailKitEmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<MailKitEmailService> _logger;

    public MailKitEmailService(IConfiguration configuration, ILogger<MailKitEmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string body)
    {
        var smtpServer = _configuration["EmailSettings:SmtpServer"] ?? string.Empty;
        var portStr = _configuration["EmailSettings:Port"] ?? "587";
        var senderEmail = _configuration["EmailSettings:SenderEmail"] ?? string.Empty;
        var senderPassword = _configuration["EmailSettings:SenderPassword"] ?? string.Empty;
        var enableSslStr = _configuration["EmailSettings:EnableSsl"] ?? "true";

        if (string.IsNullOrEmpty(smtpServer) || string.IsNullOrEmpty(senderEmail))
        {
            _logger.LogWarning("Email sending requested but SMTP server or sender email is not configured. Email to {ToEmail} not sent.", toEmail);
            return;
        }

        var port = int.TryParse(portStr, out var p) ? p : 587;
        var enableSsl = bool.TryParse(enableSslStr, out var ssl) && ssl;

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("GoodTrack Support", senderEmail));
            message.To.Add(new MailboxAddress("", toEmail));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder { HtmlBody = body };
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            
            var secureSocketOption = SecureSocketOptions.StartTls;
            if (port == 465)
            {
                secureSocketOption = SecureSocketOptions.SslOnConnect;
            }
            else if (port == 25 || !enableSsl)
            {
                secureSocketOption = SecureSocketOptions.None;
            }

            await client.ConnectAsync(smtpServer, port, secureSocketOption);

            if (!string.IsNullOrEmpty(senderPassword))
            {
                await client.AuthenticateAsync(senderEmail, senderPassword);
            }

            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Successfully sent email to {ToEmail} with subject: {Subject}", toEmail, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {ToEmail} via SMTP server {SmtpServer}", toEmail, smtpServer);
            throw;
        }
    }
}
