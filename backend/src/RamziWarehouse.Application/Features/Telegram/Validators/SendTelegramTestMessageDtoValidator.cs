using FluentValidation;
using RamziWarehouse.Application.Features.Telegram.Dtos;

namespace RamziWarehouse.Application.Features.Telegram.Validators;

public sealed class SendTelegramTestMessageDtoValidator
    : AbstractValidator<SendTelegramTestMessageDto>
{
    public SendTelegramTestMessageDtoValidator()
    {
        RuleFor(request => request.Channel)
            .IsInEnum()
            .WithMessage("Düzgün Telegram kanalı seçilməlidir.");

        RuleFor(request => request.Message)
            .NotEmpty()
            .WithMessage("Mesaj boş ola bilməz.")
            .MaximumLength(4000)
            .WithMessage("Mesaj 4000 simvoldan çox ola bilməz.");
    }
}