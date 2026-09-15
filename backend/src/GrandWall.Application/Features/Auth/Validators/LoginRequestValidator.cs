using FluentValidation;
using GrandWall.Application.Features.Auth.Dtos;

namespace GrandWall.Application.Features.Auth.Validators;

public sealed class LoginRequestValidator
    : AbstractValidator<LoginRequestDto>
{
    public LoginRequestValidator()
    {
        RuleFor(request => request.Username)
            .NotEmpty()
            .WithMessage("İstifadəçi adı mütləqdir.")
            .MaximumLength(100)
            .WithMessage("İstifadəçi adı 100 simvoldan çox ola bilməz.");

        RuleFor(request => request.Password)
            .NotEmpty()
            .WithMessage("Şifrə mütləqdir.")
            .MaximumLength(100)
            .WithMessage("Şifrə 100 simvoldan çox ola bilməz.");
    }
}