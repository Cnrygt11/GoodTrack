using System.Threading.Tasks;

namespace GoodTrack.API.Abstractions.Services;

public interface IEmailService
{
    Task SendVerificationEmailAsync(string email, string verificationLink);
}
