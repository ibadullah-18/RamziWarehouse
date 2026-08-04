using RamziWarehouse.Application.Common.Notifications;

namespace RamziWarehouse.Application.Features.Telegram.Dtos;

public sealed class SendTelegramTestMessageDto
{
    public TelegramChannel Channel { get; init; }

    public string Message { get; init; } = string.Empty;
}