using FluentValidation;
using RamziWarehouse.Application.Features.ProductReturns.Dtos;

namespace RamziWarehouse.Application.Features.ProductReturns.Validators;

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