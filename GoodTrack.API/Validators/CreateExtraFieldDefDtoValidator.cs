using FluentValidation;
using GoodTrack.API.DTOs.Product;

namespace GoodTrack.API.Validators;

public sealed class CreateExtraFieldDefDtoValidator : AbstractValidator<CreateExtraFieldDefDto>
{
    public CreateExtraFieldDefDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Alan adı boş bırakılamaz.")
            .MaximumLength(100).WithMessage("Alan adı en fazla 100 karakter olabilir.");

        RuleFor(x => x.Type)
            .NotEmpty().WithMessage("Alan tipi seçimi zorunludur.")
            .Must(type => type == "text" || type == "select")
            .WithMessage("Geçersiz alan tipi. Sadece 'text' veya 'select' olabilir.");
    }
}
