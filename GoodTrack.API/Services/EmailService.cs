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

    public async Task SendVerificationEmailAsync(string email, string verificationLink)
    {
        var smtpServer = _configuration["EmailSettings:SmtpServer"];
        var portStr = _configuration["EmailSettings:Port"];
        var senderEmail = _configuration["EmailSettings:SenderEmail"];
        var senderPassword = _configuration["EmailSettings:SenderPassword"];
        var enableSslStr = _configuration["EmailSettings:EnableSsl"] ?? "true";

        bool isSmtpConfigured = !string.IsNullOrWhiteSpace(smtpServer) &&
                                !string.IsNullOrWhiteSpace(senderEmail) &&
                                !string.IsNullOrWhiteSpace(senderPassword);

        string subject = "GoodTrack Hesap Doğrulama / Account Verification";
        string body = $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>
                <h2 style='color: #06b6d4; text-align: center;'>GoodTrack Hesap Aktivasyonu</h2>
                <p>Sisteme kayıt olduğunuz için teşekkürler. Hesabınızı aktive etmek için lütfen aşağıdaki doğrulama bağlantısına tıklayın:</p>
                <div style='text-align: center; margin: 24px 0;'>
                    <a href='{verificationLink}' style='background-color: #06b6d4; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;'>Hesabımı Doğrula</a>
                </div>
                <p style='font-size: 13px; color: #64748b; text-align: center;'>Bu bağlantı 15 dakika geçerlidir.</p>
                <hr style='border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;' />
                <h2 style='color: #0f172a; text-align: center;'>GoodTrack Account Activation</h2>
                <p>Thank you for registering. Please click the button below to verify and activate your account:</p>
                <div style='text-align: center; margin: 24px 0;'>
                    <a href='{verificationLink}' style='background-color: #0f172a; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;'>Verify My Account</a>
                </div>
                <p style='font-size: 13px; color: #64748b; text-align: center;'>This link is valid for 15 minutes.</p>
                <p style='font-size: 11px; color: #94a3b8; text-align: center; margin-top: 20px;'>
                    Bağlantı çalışmıyorsa aşağıdaki linki kopyalayıp tarayıcınıza yapıştırabilirsiniz:<br/>
                    <a href='{verificationLink}' style='color: #06b6d4;'>{verificationLink}</a>
                </p>
            </div>";

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
            "[EMAIL SIMULATOR] VERIFICATION LINK: {Link}\n" +
            "==================================================",
            email, subject, verificationLink);
    }
}
