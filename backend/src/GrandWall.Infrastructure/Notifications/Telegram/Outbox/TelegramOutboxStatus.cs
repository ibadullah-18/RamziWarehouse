namespace GrandWall.Infrastructure.Notifications.Telegram.Outbox;

public enum TelegramOutboxStatus
{
    Pending = 1,
    Processing = 2,
    Sent = 3,
    Failed = 4,
    Abandoned = 5
}