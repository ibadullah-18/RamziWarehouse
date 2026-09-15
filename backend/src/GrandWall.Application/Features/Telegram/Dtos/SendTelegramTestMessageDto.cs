using GrandWall.Application.Common.Notifications;

namespace GrandWall.Application.Features.Telegram.Dtos;

public sealed class SendTelegramTestMessageDto
{
    public TelegramChannel Channel { get; init; }

    public string Message { get; init; } = string.Empty;
}