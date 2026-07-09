using FluentValidation;
using GoodTrack.API.DTOs.Feedback;

namespace GoodTrack.API.Validators;

public sealed class FeedbackInputDtoValidator : AbstractValidator<FeedbackInputDto>
{
    public FeedbackInputDtoValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Geri bildirim başlığı boş bırakılamaz.")
            .MaximumLength(100).WithMessage("Geri bildirim başlığı en fazla 100 karakter olabilir.");

        RuleFor(x => x.Message)
            .NotEmpty().WithMessage("Geri bildirim mesajı boş bırakılamaz.")
            .MaximumLength(2000).WithMessage("Geri bildirim mesajı en fazla 2000 karakter olabilir.");

        RuleFor(x => x.BrowserInfo)
            .MaximumLength(500).WithMessage("Tarayıcı bilgisi en fazla 500 karakter olabilir.");
    }
}
