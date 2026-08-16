namespace RamziWarehouse.Infrastructure.Notifications.Telegram;

public sealed class TelegramSettings
{
    public const string SectionName = "Telegram";

    public bool Enabled { get; set; }

    public TelegramChannelSettings Orders { get; set; }
        = new();

    public TelegramChannelSettings Returns { get; set; }
        = new();

    public TelegramChannelSettings Delivery { get; set; }
        = new();

    public TelegramChannelSettings Attendance { get; set; }
        = new();
}