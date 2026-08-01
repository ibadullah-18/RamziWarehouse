using FluentValidation;
using RamziWarehouse.Application.Features.Users.Dtos;

namespace RamziWarehouse.Application.Features.Users.Validators;

public sealed class CreateUserRequestValidator
    : AbstractValidator<CreateUserRequestDto>
{
    public CreateUserRequestValidator()
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

        RuleFor(request => request.Password)
            .NotEmpty()
            .WithMessage("Şifrə mütləqdir.")
            .MinimumLength(8)
            .WithMessage("Şifrə ən az 8 simvol olmalıdır.")
            .MaximumLength(100)
            .WithMessage("Şifrə 100 simvoldan çox ola bilməz.")
            .Matches("[A-Z]")
            .WithMessage("Şifrədə ən az bir böyük hərf olmalıdır.")
            .Matches("[a-z]")
            .WithMessage("Şifrədə ən az bir kiçik hərf olmalıdır.")
            .Matches("[0-9]")
            .WithMessage("Şifrədə ən az bir rəqəm olmalıdır.");

        RuleFor(request => request.Role)
            .IsInEnum()
            .WithMessage("İstifadəçi rolu düzgün deyil.");
    }
}