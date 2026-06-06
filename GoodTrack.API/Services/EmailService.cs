using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;

namespace GoodTrack.API.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendVerificationEmailAsync(string email, string code)
    {
        var smtpServer = _configuration["EmailSettings:SmtpServer"];
        var portStr = _configuration["EmailSettings:Port"];
        var senderEmail = _configuration["EmailSettings:SenderEmail"];
        var senderPassword = _configuration["EmailSettings:SenderPassword"];
        var enableSslStr = _configuration["EmailSettings:EnableSsl"] ?? "true";

        bool isSmtpConfigured = !string.IsNullOrWhiteSpace(smtpServer) &&
                                !string.IsNullOrWhiteSpace(senderEmail) &&
                                !string.IsNullOrWhiteSpace(senderPassword);

        string subject = "GoodTrack E-posta Doğrulama Kodu / Email Verification Code";
        string body = $@"
            <h3>GoodTrack E-posta Doğrulaması</h3>
            <p>Sisteme kayıt olduğunuz için teşekkürler. Hesabınızı aktive etmek için aşağıdaki 6 haneli kodu kullanın:</p>
            <h2 style='color:#f5a623; font-size:28px; letter-spacing:4px;'>{code}</h2>
            <p>Bu kod 15 dakika geçerlidir.</p>
            <hr />
            <h3>GoodTrack Email Verification</h3>
            <p>Thank you for registering. Please use the following 6-digit code to activate your account:</p>
            <h2 style='color:#06b6d4; font-size:28px; letter-spacing:4px;'>{code}</h2>
            <p>This code is valid for 15 minutes.</p>";

        if (isSmtpConfigured)
        {
            try
            {
                int port = int.TryParse(portStr, out int p) ? p : 587;
                bool enableSsl = bool.TryParse(enableSslStr, out bool ssl) && ssl;

                using (var client = new SmtpClient(smtpServer, port))
                {
                    client.UseDefaultCredentials = false;
                    client.Credentials = new NetworkCredential(senderEmail, senderPassword);
                    client.EnableSsl = enableSsl;

                    using (var mailMessage = new MailMessage())
                    {
                        mailMessage.From = new MailAddress(senderEmail!, "GoodTrack");
                        mailMessage.To.Add(email);
                        mailMessage.Subject = subject;
                        mailMessage.Body = body;
                        mailMessage.IsBodyHtml = true;

                        await client.SendMailAsync(mailMessage);
                        _logger.LogInformation("Verification email successfully sent to {Email}", email);
                    }
                }
                return; // Sent successfully
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email via SMTP. Falling back to console logging.");
            }
        }
        else
        {
            _logger.LogInformation("SMTP email settings not fully configured. Falling back to console logging.");
        }

        // Fallback: print to console for development/test convenience
        _logger.LogWarning(
            "\n==================================================\n" +
            "[EMAIL SIMULATOR] To: {Email}\n" +
            "[EMAIL SIMULATOR] Subject: {Subject}\n" +
            "[EMAIL SIMULATOR] VERIFICATION CODE: {Code}\n" +
            "==================================================",
            email, subject, code);
    }
}
