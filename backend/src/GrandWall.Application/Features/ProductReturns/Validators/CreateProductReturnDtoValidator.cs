using FluentValidation;
using GrandWall.Application.Features.ProductReturns.Dtos;

namespace GrandWall.Application.Features.ProductReturns.Validators;

public sealed class CreateProductReturnDtoValidator
    : AbstractValidator<CreateProductReturnDto>
{
    public CreateProductReturnDtoValidator()
    {
        RuleFor(productReturn => productReturn.CustomerId)
            .NotEmpty()
            .WithMessage("Müştəri seçilməlidir.");

        RuleFor(productReturn => productReturn.WarehouseId)
            .NotEmpty()
            .WithMessage("Anbar seçilməlidir.");

        RuleFor(productReturn => productReturn.AdditionalNote)
            .MaximumLength(1000)
            .WithMessage("Əlavə qeyd 1000 simvoldan çox ola bilməz.");

        RuleFor(productReturn => productReturn.Items)
            .NotNull()
            .WithMessage("Məhsullar daxil edilməlidir.")
            .NotEmpty()
            .WithMessage("Ən azı bir məhsul daxil edilməlidir.");

        RuleForEach(productReturn => productReturn.Items)
            .SetValidator(new CreateProductReturnItemDtoValidator());
    }
}