using FluentValidation.TestHelper;
using Xunit;
using GoodTrack.API.Constants;
using GoodTrack.API.DTOs.Auth;
using GoodTrack.API.DTOs.Feedback;
using GoodTrack.API.Validators;

namespace GoodTrack.API.Tests;

public class ValidatorsTests
{
    // ─── RegisterRequestValidator ────────────────────────────────────────────────

    private static RegisterRequest ValidRegister() => new()
    {
        Username = "seller_one",
        Password = "secret123",
        Email = "user@mail.com",
        Role = Roles.Seller,
    };

    [Fact]
    public void Register_Valid_HasNoErrors()
    {
        var result = new RegisterRequestValidator().TestValidate(ValidRegister());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Register_EmptyUsername_HasError()
    {
        var dto = ValidRegister();
        dto.Username = "";
        new RegisterRequestValidator().TestValidate(dto).ShouldHaveValidationErrorFor(x => x.Username);
    }

    [Fact]
    public void Register_ShortPassword_HasError()
    {
        var dto = ValidRegister();
        dto.Password = "123";
        new RegisterRequestValidator().TestValidate(dto).ShouldHaveValidationErrorFor(x => x.Password);
    }

    [Fact]
    public void Register_InvalidEmail_HasError()
    {
        var dto = ValidRegister();
        dto.Email = "not-an-email";
        new RegisterRequestValidator().TestValidate(dto).ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public void Register_InvalidRole_HasError()
    {
        var dto = ValidRegister();
        dto.Role = "superuser";
        new RegisterRequestValidator().TestValidate(dto).ShouldHaveValidationErrorFor(x => x.Role);
    }

    [Fact]
    public void Register_AdminRole_IsValid()
    {
        // Admin kaydı geçerli bir roldür; güvenlik anahtarı kontrolü AuthService'tedir.
        // (Önceki kural admin'i validator'da reddedip admin kaydını fiilen imkânsız kılıyordu.)
        var dto = ValidRegister();
        dto.Role = "admin";
        new RegisterRequestValidator().TestValidate(dto).ShouldNotHaveValidationErrorFor(x => x.Role);
    }

    // ─── LoginRequestValidator ───────────────────────────────────────────────────

    [Fact]
    public void Login_Valid_HasNoErrors()
    {
        var result = new LoginRequestValidator().TestValidate(new LoginRequest { Username = "u", Password = "p" });
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Login_EmptyCredentials_HaveErrors()
    {
        var result = new LoginRequestValidator().TestValidate(new LoginRequest { Username = "", Password = "" });
        result.ShouldHaveValidationErrorFor(x => x.Username);
        result.ShouldHaveValidationErrorFor(x => x.Password);
    }

    // ─── FeedbackInputDtoValidator ───────────────────────────────────────────────

    [Fact]
    public void Feedback_Valid_HasNoErrors()
    {
        var result = new FeedbackInputDtoValidator().TestValidate(new FeedbackInputDto { Title = "Hata", Message = "Detay" });
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Feedback_EmptyTitle_HasError()
    {
        var result = new FeedbackInputDtoValidator().TestValidate(new FeedbackInputDto { Title = "", Message = "Detay" });
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public void Feedback_MessageTooLong_HasError()
    {
        var result = new FeedbackInputDtoValidator().TestValidate(new FeedbackInputDto { Title = "Hata", Message = new string('x', 2001) });
        result.ShouldHaveValidationErrorFor(x => x.Message);
    }
}
