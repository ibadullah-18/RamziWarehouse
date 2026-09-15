using FluentValidation;
using GrandWall.Application.Features.ProductReturns.Dtos;

namespace GrandWall.Application.Features.ProductReturns.Validators;

public sealed class ProcessProductReturnDtoValidator
    : AbstractValidator<ProcessProductReturnDto>
{
    public ProcessProductReturnDtoValidator()
    {
        RuleFor(request => request.Note)
            .MaximumLength(500)
            .WithMessage(
                "Əməliyyat qeydi 500 simvoldan çox ola bilməz.");
    }
}