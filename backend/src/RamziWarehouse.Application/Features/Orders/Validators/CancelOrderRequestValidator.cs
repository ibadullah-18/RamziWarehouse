using FluentValidation;
using RamziWarehouse.Application.Features.Orders.Dtos;

namespace RamziWarehouse.Application.Features.Orders.Validators;

public sealed class CancelOrderRequestValidator
    : AbstractValidator<CancelOrderRequestDto>
{
    public CancelOrderRequestValidator()
    {
        RuleFor(request => request.Note)
            .NotEmpty()
            .WithMessage("Ləğv edilmə səbəbi məcburidir.")
            .MaximumLength(500)
            .WithMessage(
                "Ləğv edilmə səbəbi maksimum 500 simvol ola bilər.");
    }
}