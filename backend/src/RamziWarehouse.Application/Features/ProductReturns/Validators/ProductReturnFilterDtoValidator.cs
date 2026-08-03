using FluentValidation;
using RamziWarehouse.Application.Features.ProductReturns.Dtos;

namespace RamziWarehouse.Application.Features.ProductReturns.Validators;

public sealed class ProductReturnFilterDtoValidator
    : AbstractValidator<ProductReturnFilterDto>
{
    public ProductReturnFilterDtoValidator()
    {
        RuleFor(filter => filter.Search)
            .MaximumLength(100)
            .WithMessage("Axtarış mətni 100 simvoldan çox ola bilməz.");

        RuleFor(filter => filter.Status)
            .IsInEnum()
            .When(filter => filter.Status.HasValue)
            .WithMessage("Vazvrad statusu düzgün deyil.");

        RuleFor(filter => filter.ProductType)
            .IsInEnum()
            .When(filter => filter.ProductType.HasValue)
            .WithMessage("Məhsul növü düzgün deyil.");

        RuleFor(filter => filter.PageNumber)
            .GreaterThanOrEqualTo(1)
            .WithMessage("Səhifə nömrəsi ən azı 1 olmalıdır.");

        RuleFor(filter => filter.PageSize)
            .InclusiveBetween(1, 100)
            .WithMessage(
                "Bir səhifədəki nəticə sayı 1–100 arasında olmalıdır.");

        RuleFor(filter => filter.ToDateUtc)
            .GreaterThanOrEqualTo(filter => filter.FromDateUtc)
            .When(filter =>
                filter.FromDateUtc.HasValue &&
                filter.ToDateUtc.HasValue)
            .WithMessage(
                "Bitmə tarixi başlanğıc tarixindən əvvəl ola bilməz.");
    }
}