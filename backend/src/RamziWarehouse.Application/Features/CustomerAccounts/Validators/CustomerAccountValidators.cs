using FluentValidation;
using RamziWarehouse.Application.Features.CustomerAccounts.Dtos;

namespace RamziWarehouse.Application.Features.CustomerAccounts.Validators;

public sealed class CustomerAccountListQueryValidator
    : AbstractValidator<CustomerAccountListQueryDto>
{
    public CustomerAccountListQueryValidator()
    {
        RuleFor(request => request.Search)
            .MaximumLength(150)
            .WithMessage("Axtarış mətni 150 simvoldan çox ola bilməz.");

        RuleFor(request => request.PageNumber)
            .GreaterThanOrEqualTo(1)
            .WithMessage("Səhifə nömrəsi ən azı 1 olmalıdır.");

        RuleFor(request => request.PageSize)
            .InclusiveBetween(1, 100)
            .WithMessage("Səhifə ölçüsü 1–100 arasında olmalıdır.");
    }
}

public sealed class CreateCustomerAccountRequestValidator
    : AbstractValidator<CreateCustomerAccountRequestDto>
{
    public CreateCustomerAccountRequestValidator()
    {
        RuleFor(request => request.CustomerId)
            .NotEmpty()
            .WithMessage("Müştəri seçilməlidir.");

        RuleFor(request => request.TodayDebt)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Bugünkü borc mənfi ola bilməz.");

        RuleFor(request => request.InitialPreviousDebt)
            .GreaterThanOrEqualTo(0)
            .When(request => request.InitialPreviousDebt.HasValue)
            .WithMessage("Əvvəlki borc mənfi ola bilməz.");

        RuleFor(request => request)
            .Must(request =>
                request.TodayDebt > 0 ||
                request.InitialPreviousDebt.GetValueOrDefault() > 0)
            .WithMessage(
                "Bugünkü və ya əvvəlki borcdan ən az biri sıfırdan böyük olmalıdır.");

        RuleFor(request => request.Note)
            .MaximumLength(500)
            .WithMessage("Qeyd 500 simvoldan çox ola bilməz.");
    }
}

public sealed class RecordCustomerPaymentRequestValidator
    : AbstractValidator<RecordCustomerPaymentRequestDto>
{
    public RecordCustomerPaymentRequestValidator()
    {
        RuleFor(request => request.CustomerId)
            .NotEmpty()
            .WithMessage("Müştəri seçilməlidir.");

        RuleFor(request => request.Amount)
            .GreaterThan(0)
            .WithMessage("Ödəniş məbləği sıfırdan böyük olmalıdır.");

        RuleFor(request => request.Note)
            .MaximumLength(500)
            .WithMessage("Qeyd 500 simvoldan çox ola bilməz.");
    }
}

public sealed class CorrectPreviousDebtRequestValidator
    : AbstractValidator<CorrectPreviousDebtRequestDto>
{
    public CorrectPreviousDebtRequestValidator()
    {
        RuleFor(request => request.CustomerId)
            .NotEmpty()
            .WithMessage("Müştəri seçilməlidir.");

        RuleFor(request => request.CorrectedPreviousDebt)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Düzəldilmiş köhnə borc mənfi ola bilməz.");

        RuleFor(request => request.Reason)
            .NotEmpty()
            .WithMessage("Düzəliş səbəbi yazılmalıdır.")
            .MinimumLength(3)
            .WithMessage("Düzəliş səbəbi ən azı 3 simvol olmalıdır.")
            .MaximumLength(400)
            .WithMessage("Düzəliş səbəbi 400 simvoldan çox ola bilməz.");
    }
}
