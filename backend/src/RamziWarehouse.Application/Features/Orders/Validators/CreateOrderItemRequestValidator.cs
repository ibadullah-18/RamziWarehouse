using FluentValidation;
using RamziWarehouse.Application.Features.Orders.Dtos;

namespace RamziWarehouse.Application.Features.Orders.Validators;

public sealed class CreateOrderItemRequestValidator
    : AbstractValidator<CreateOrderItemRequestDto>
{
    public CreateOrderItemRequestValidator()
    {
        RuleFor(request => request.ProductCode)
            .NotEmpty()
            .WithMessage("Məhsul kodu məcburidir.")
            .MaximumLength(50)
            .WithMessage("Məhsul kodu maksimum 50 simvol ola bilər.");

        RuleFor(request => request.PartyNumber)
            .NotEmpty()
            .WithMessage("Partiya nömrəsi məcburidir.")
            .MaximumLength(50)
            .WithMessage("Partiya nömrəsi maksimum 50 simvol ola bilər.");

        RuleFor(request => request.ProductType)
            .IsInEnum()
            .WithMessage("Məhsul növü düzgün deyil.");

        RuleFor(request => request.Quantity)
            .GreaterThan(0)
            .WithMessage("Məhsul sayı sıfırdan böyük olmalıdır.")
            .LessThanOrEqualTo(100000)
            .WithMessage("Məhsul sayı maksimum 100000 ola bilər.");
    }
}