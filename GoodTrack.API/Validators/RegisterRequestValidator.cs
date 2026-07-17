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

        // İlk bariyer: asıl şifre politikası (8-20 + karmaşıklık) AuthService'te uygulanır.
        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifre boş bırakılamaz.")
            .MinimumLength(8).WithMessage("Şifre en az 8 karakter olmalıdır.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta adresi boş bırakılamaz.")
            .EmailAddress().WithMessage("Geçersiz e-posta adresi formatı.");

        // Admin kaydı da geçerli bir roldür; güvenlik anahtarı kontrolü AuthService'te yapılır.
        RuleFor(x => x.Role)
            .NotEmpty().WithMessage("Rol seçimi zorunludur.")
            .Must(role => role == Roles.Seller || role == Roles.Mfr || role == Roles.Admin)
            .WithMessage("Geçersiz rol seçimi.");
    }
}
