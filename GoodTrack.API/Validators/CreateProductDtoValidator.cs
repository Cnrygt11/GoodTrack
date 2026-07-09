using FluentValidation;
using GoodTrack.API.DTOs.Product;

namespace GoodTrack.API.Validators;

public sealed class CreateProductDtoValidator : AbstractValidator<CreateProductDto>
{
    public CreateProductDtoValidator()
    {
        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Ürün/Sipariş kodu boş bırakılamaz.")
            .MaximumLength(100).WithMessage("Ürün/Sipariş kodu en fazla 100 karakter olabilir.");

        RuleFor(x => x.ManufacturerId)
            .NotEmpty().WithMessage("Lütfen bir üretici (manufacturer) seçiniz.")
            .MaximumLength(100).WithMessage("Üretici ID en fazla 100 karakter olabilir.");

        RuleFor(x => x.Text)
            .MaximumLength(1000).WithMessage("Açıklama metni en fazla 1000 karakter olabilir.");

        RuleFor(x => x.Length)
            .MaximumLength(50).WithMessage("Boyut/Uzunluk bilgisi en fazla 50 karakter olabilir.");
    }
}
