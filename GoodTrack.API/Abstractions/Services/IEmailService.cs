using System.Threading.Tasks;

namespace GoodTrack.API.Abstractions.Services;

public interface IEmailService
{
    Task SendEmailAsync(string toEmail, string subject, string body);
}
