using FluentValidation;
using RamziWarehouse.Application.Features.Orders.Dtos;

namespace RamziWarehouse.Application.Features.Orders.Validators;

public sealed class
    CompleteOrderDeliveryRequestDtoValidator
    : AbstractValidator<
        CompleteOrderDeliveryRequestDto>
{
    public CompleteOrderDeliveryRequestDtoValidator()
    {
        RuleFor(request => request.Note)
            .MaximumLength(1000)
            .WithMessage(
                "Təhvil qeydi 1000 simvoldan çox ola bilməz.")
            .When(request =>
                !string.IsNullOrWhiteSpace(request.Note));
    }
}