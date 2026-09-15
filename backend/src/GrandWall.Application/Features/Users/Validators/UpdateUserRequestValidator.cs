using FluentValidation;
using GrandWall.Application.Features.Users.Dtos;

namespace GrandWall.Application.Features.Users.Validators;

public sealed class UpdateUserRequestValidator
    : AbstractValidator<UpdateUserRequestDto>
{
    public UpdateUserRequestValidator()
    {
        RuleFor(request => request.FullName)
            .NotEmpty()
            .WithMessage("Ad və soyad mütləqdir.")
            .MaximumLength(150)
            .WithMessage("Ad və soyad 150 simvoldan çox ola bilməz.");

        RuleFor(request => request.Username)
            .NotEmpty()
            .WithMessage("İstifadəçi adı mütləqdir.")
            .MinimumLength(3)
            .WithMessage("İstifadəçi adı ən az 3 simvol olmalıdır.")
            .MaximumLength(100)
            .WithMessage("İstifadəçi adı 100 simvoldan çox ola bilməz.")
            .Matches(@"^[\p{L}\p{N}._-]+$")
            .WithMessage(
                "İstifadəçi adında yalnız hərf, rəqəm, nöqtə, alt xətt və tire ola bilər.");

        RuleFor(request => request.Role)
            .IsInEnum()
            .WithMessage("İstifadəçi rolu düzgün deyil.");

        RuleFor(request => request.IsActive)
            .NotNull()
            .WithMessage("Hesabın aktivlik vəziyyəti mütləq göndərilməlidir.");
    }
}