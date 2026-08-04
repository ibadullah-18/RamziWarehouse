namespace RamziWarehouse.Infrastructure.Notifications.Telegram;

public sealed class TelegramChannelSettings
{
    public string BotToken { get; set; } = string.Empty;

    public long ChatId { get; set; }
}