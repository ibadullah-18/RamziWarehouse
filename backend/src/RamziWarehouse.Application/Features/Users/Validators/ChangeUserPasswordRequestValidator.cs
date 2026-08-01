using FluentValidation;
using RamziWarehouse.Application.Features.Users.Dtos;

namespace RamziWarehouse.Application.Features.Users.Validators;

public sealed class ChangeUserPasswordRequestValidator
    : AbstractValidator<ChangeUserPasswordRequestDto>
{
    public ChangeUserPasswordRequestValidator()
    {
        RuleFor(request => request.NewPassword)
            .NotEmpty()
            .WithMessage("Yeni şifrə mütləqdir.")
            .MinimumLength(8)
            .WithMessage("Yeni şifrə ən az 8 simvol olmalıdır.")
            .MaximumLength(100)
            .WithMessage("Yeni şifrə 100 simvoldan çox ola bilməz.")
            .Matches("[A-Z]")
            .WithMessage("Yeni şifrədə ən az bir böyük hərf olmalıdır.")
            .Matches("[a-z]")
            .WithMessage("Yeni şifrədə ən az bir kiçik hərf olmalıdır.")
            .Matches("[0-9]")
            .WithMessage("Yeni şifrədə ən az bir rəqəm olmalıdır.");
    }
}