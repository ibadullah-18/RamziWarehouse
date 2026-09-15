using FluentValidation;
using GrandWall.Application.Features.Customers.Dtos;

namespace GrandWall.Application.Features.Customers.Validators;

public sealed class UpdateCustomerRequestValidator
    : AbstractValidator<UpdateCustomerRequestDto>
{
    public UpdateCustomerRequestValidator()
    {
        RuleFor(request => request.Name)
            .NotEmpty()
            .WithMessage("Müştəri adı mütləqdir.")
            .MaximumLength(150)
            .WithMessage("Müştəri adı 150 simvoldan çox ola bilməz.");

        RuleFor(request => request.PhoneNumber)
            .MaximumLength(30)
            .WithMessage("Telefon nömrəsi 30 simvoldan çox ola bilməz.")
            .Matches(@"^[0-9+\s()-]{7,30}$")
            .WithMessage("Telefon nömrəsi düzgün formatda deyil.")
            .When(request =>
                !string.IsNullOrWhiteSpace(request.PhoneNumber));

        RuleFor(request => request.Note)
            .MaximumLength(1000)
            .WithMessage("Qeyd 1000 simvoldan çox ola bilməz.");

        RuleFor(request => request.IsActive)
            .NotNull()
            .WithMessage("Aktivlik vəziyyəti mütləq göndərilməlidir.");
    }
}