using FluentValidation;
using GoodTrack.API.DTOs.Product;

namespace GoodTrack.API.Validators;

public sealed class CreateCatalogProductDtoValidator : AbstractValidator<CreateCatalogProductDto>
{
    public CreateCatalogProductDtoValidator()
    {
        RuleFor(x => x.ProductCode)
            .NotEmpty().WithMessage("Ürün kodu boş bırakılamaz.")
            .MaximumLength(100).WithMessage("Ürün kodu en fazla 100 karakter olabilir.");

        RuleFor(x => x.ManufacturerId)
            .NotEmpty().WithMessage("Lütfen bir üretici seçiniz.");
    }
}
