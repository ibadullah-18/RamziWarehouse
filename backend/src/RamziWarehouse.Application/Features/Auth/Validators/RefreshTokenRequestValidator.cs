using FluentValidation;
using RamziWarehouse.Application.Features.Auth.Dtos;

namespace RamziWarehouse.Application.Features.Auth.Validators;

public sealed class RefreshTokenRequestValidator
    : AbstractValidator<RefreshTokenRequestDto>
{
    public RefreshTokenRequestValidator()
    {
        RuleFor(request => request.RefreshToken)
            .NotEmpty()
            .WithMessage("Refresh token mütləqdir.")
            .MaximumLength(2048)
            .WithMessage("Refresh token düzgün formatda deyil.");
    }
}