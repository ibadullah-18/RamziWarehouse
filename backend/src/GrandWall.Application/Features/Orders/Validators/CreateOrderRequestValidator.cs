using FluentValidation;
using GrandWall.Application.Features.Orders.Dtos;

namespace GrandWall.Application.Features.Orders.Validators;

public sealed class CreateOrderRequestValidator
    : AbstractValidator<CreateOrderRequestDto>
{
    public CreateOrderRequestValidator()
    {
        RuleFor(request => request.OrderNumber)
            .NotEmpty()
            .WithMessage("Qaimə nömrəsi məcburidir.")
            .MaximumLength(50)
            .WithMessage("Qaimə nömrəsi maksimum 50 simvol ola bilər.");

        RuleFor(request => request.OrderDate)
            .NotEmpty()
            .WithMessage("Qaimə tarixi məcburidir.");

        RuleFor(request => request.CustomerId)
            .NotEmpty()
            .WithMessage("Müştəri seçilməlidir.");

        RuleFor(request => request.WarehouseId)
            .NotEmpty()
            .WithMessage("Anbar seçilməlidir.");

        RuleFor(request => request.Note)
            .MaximumLength(1000)
            .WithMessage("Əlavə qeyd maksimum 1000 simvol ola bilər.");

        RuleFor(request => request.Items)
            .NotEmpty()
            .WithMessage("Sifarişdə ən azı bir məhsul olmalıdır.")
            .Must(items => items.Count <= 500)
            .WithMessage("Bir sifarişdə maksimum 500 məhsul sətri ola bilər.");

        RuleForEach(request => request.Items)
            .SetValidator(new CreateOrderItemRequestValidator());

        RuleFor(request => request.Items)
            .Must(items => items
                .GroupBy(item => new
                {
                    ProductCode = (item.ProductCode ?? string.Empty)
                        .Trim()
                        .ToUpperInvariant(),

                    PartyNumber = (item.PartyNumber ?? string.Empty)
                        .Trim()
                        .ToUpperInvariant(),

                    item.ProductType
                })
                .All(group => group.Count() == 1))
            .When(request => request.Items.Count > 0)
            .WithMessage(
                "Eyni məhsul kodu, partiya və məhsul növü sifarişdə təkrar yazıla bilməz.");
    }
}