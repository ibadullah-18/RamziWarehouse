using FluentValidation;
using RamziWarehouse.Application.Features.ProductReturns.Dtos;

namespace RamziWarehouse.Application.Features.ProductReturns.Validators;

public sealed class CreateProductReturnItemDtoValidator
    : AbstractValidator<CreateProductReturnItemDto>
{
    public CreateProductReturnItemDtoValidator()
    {
        RuleFor(item => item.ProductCode)
            .NotEmpty()
            .WithMessage("Məhsul kodu mütləqdir.")
            .MaximumLength(50)
            .WithMessage("Məhsul kodu 50 simvoldan çox ola bilməz.");

        RuleFor(item => item.BatchNumber)
            .NotEmpty()
            .WithMessage("Partiya nömrəsi mütləqdir.")
            .MaximumLength(50)
            .WithMessage(
                "Partiya nömrəsi 50 simvoldan çox ola bilməz.");

        RuleFor(item => item.Quantity)
            .GreaterThan(0)
            .WithMessage("Məhsul sayı sıfırdan böyük olmalıdır.");

        RuleFor(item => item.ProductType)
            .IsInEnum()
            .WithMessage("Məhsul növü düzgün seçilməyib.");
    }
}