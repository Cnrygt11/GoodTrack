using FluentValidation;
using GoodTrack.API.DTOs.Auth;
using GoodTrack.API.Constants;

namespace GoodTrack.API.Validators;

public sealed class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Kullanıcı adı boş bırakılamaz.")
            .MaximumLength(100).WithMessage("Kullanıcı adı en fazla 100 karakter olabilir.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifre boş bırakılamaz.")
            .MinimumLength(6).WithMessage("Şifre en az 6 karakter olmalıdır.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta adresi boş bırakılamaz.")
            .EmailAddress().WithMessage("Geçersiz e-posta adresi formatı.");

        RuleFor(x => x.Role)
            .NotEmpty().WithMessage("Rol seçimi zorunludur.")
            .Must(role => role == Roles.Seller || role == Roles.Mfr)
            .WithMessage("Geçersiz rol seçimi. Sadece 'seller' veya 'mfr' olabilir.");
    }
}
