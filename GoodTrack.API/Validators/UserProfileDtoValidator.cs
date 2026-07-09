using FluentValidation;
using GoodTrack.API.DTOs.Auth;

namespace GoodTrack.API.Validators;

public sealed class UserProfileDtoValidator : AbstractValidator<UserProfileDto>
{
    public UserProfileDtoValidator()
    {
        RuleFor(x => x.Email)
            .EmailAddress().WithMessage("Geçersiz e-posta adresi formatı.")
            .When(x => !string.IsNullOrEmpty(x.Email));

        RuleFor(x => x.FirstName)
            .MaximumLength(50).WithMessage("İsim en fazla 50 karakter olabilir.");

        RuleFor(x => x.LastName)
            .MaximumLength(50).WithMessage("Soyisim en fazla 50 karakter olabilir.");

        RuleFor(x => x.Address)
            .MaximumLength(200).WithMessage("Adres en fazla 200 karakter olabilir.");

        RuleFor(x => x.City)
            .MaximumLength(100).WithMessage("Şehir en fazla 100 karakter olabilir.");

        RuleFor(x => x.Bio)
            .MaximumLength(500).WithMessage("Biyografi en fazla 500 karakter olabilir.");
    }
}
