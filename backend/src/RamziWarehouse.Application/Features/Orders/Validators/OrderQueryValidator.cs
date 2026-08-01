using FluentValidation;
using RamziWarehouse.Application.Features.Orders.Dtos;

namespace RamziWarehouse.Application.Features.Orders.Validators;

public sealed class OrderQueryValidator : AbstractValidator<OrderQueryDto>
{
    public OrderQueryValidator()
    {
        RuleFor(query => query.Search)
            .MaximumLength(100)
            .WithMessage("Axtarış mətni maksimum 100 simvol ola bilər.");

        RuleFor(query => query.Status)
            .Must(status =>
                !status.HasValue ||
                Enum.IsDefined(status.Value))
            .WithMessage("Sifariş statusu düzgün deyil.");

        RuleFor(query => query.ToDate)
            .Must((query, toDate) =>
                !query.FromDate.HasValue ||
                !toDate.HasValue ||
                toDate.Value.Date >= query.FromDate.Value.Date)
            .WithMessage(
                "Son tarix başlanğıc tarixindən əvvəl ola bilməz.");

        RuleFor(query => query.PageNumber)
            .GreaterThan(0)
            .WithMessage("Səhifə nömrəsi sıfırdan böyük olmalıdır.");

        RuleFor(query => query.PageSize)
            .InclusiveBetween(1, 100)
            .WithMessage(
                "Bir səhifədə göstərilən məlumat sayı 1–100 arasında olmalıdır.");
    }
}