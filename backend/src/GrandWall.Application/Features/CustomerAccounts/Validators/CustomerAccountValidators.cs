using FluentValidation;
using GrandWall.Application.Features.CustomerAccounts.Dtos;

namespace GrandWall.Application.Features.CustomerAccounts.Validators;

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
            .InclusiveBetween(1, 200)
            .WithMessage("Səhifə ölçüsü 1–200 arasında olmalıdır.");
    }
}

public sealed class SaveDailyDebtsRequestValidator
    : AbstractValidator<SaveDailyDebtsRequestDto>
{
    public SaveDailyDebtsRequestValidator()
    {
        RuleFor(request => request.Items)
            .NotNull()
            .Must(items => items.Count is >= 1 and <= 500)
            .WithMessage("1–500 müştəri göndərilə bilər.")
            .Must(items => items.Select(item => item.CustomerId).Distinct().Count() == items.Count)
            .WithMessage("Eyni müştəri bir neçə dəfə göndərilib.");

        RuleForEach(request => request.Items).ChildRules(item =>
        {
            item.RuleFor(x => x.CustomerId).NotEmpty().WithMessage("Müştəri seçilməlidir.");
            item.RuleFor(x => x.DailyDebt).GreaterThanOrEqualTo(0).WithMessage("Günlük borc mənfi ola bilməz.");
            item.RuleFor(x => x.OldDebt).GreaterThanOrEqualTo(0)
                .When(x => x.OldDebt.HasValue)
                .WithMessage("Köhnə borc mənfi ola bilməz.");
        });
    }
}

public sealed class CompleteSettlementRequestValidator
    : AbstractValidator<CompleteSettlementRequest>
{
    public CompleteSettlementRequestValidator()
    {
        RuleFor(request => request.OperationId).NotEmpty().WithMessage("Əməliyyat identifikatoru yoxdur.");
        RuleFor(request => request.CustomerId).NotEmpty().WithMessage("Müştəri seçilməlidir.");
        RuleFor(request => request.Cash).GreaterThanOrEqualTo(0).WithMessage("Nağd məbləğ mənfi ola bilməz.");
        RuleFor(request => request.Card).GreaterThanOrEqualTo(0).WithMessage("Kart məbləği mənfi ola bilməz.");
        RuleFor(request => request.Bonus).GreaterThanOrEqualTo(0).WithMessage("Bonus mənfi ola bilməz.");
        RuleFor(request => request.Returns).NotNull()
            .Must(returns => returns.Count <= 50)
            .WithMessage("Bir əməliyyatda ən çox 50 vazvrat seçilə bilər.")
            .Must(returns => returns.Select(r => r.ReturnId).Distinct().Count() == returns.Count)
            .WithMessage("Eyni vazvrat iki dəfə seçilib.");
        RuleForEach(request => request.Returns).ChildRules(item =>
        {
            item.RuleFor(x => x.ReturnId).NotEmpty();
            item.RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Vazvrat məbləği sıfırdan böyük olmalıdır.");
        });
        RuleFor(request => request.Note).MaximumLength(400).WithMessage("Qeyd 400 simvoldan çox ola bilməz.");
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
