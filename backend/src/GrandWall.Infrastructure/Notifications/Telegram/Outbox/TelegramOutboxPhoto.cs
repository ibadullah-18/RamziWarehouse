using GrandWall.Domain.Common;

namespace GrandWall.Infrastructure.Notifications.Telegram.Outbox;

public sealed class TelegramOutboxPhoto : BaseEntity
{
    public Guid TelegramOutboxMessageId { get; set; }

    public TelegramOutboxMessage TelegramOutboxMessage { get; set; }
        = null!;

    public string CloudinaryPublicId { get; set; }
        = string.Empty;

    public string OriginalFileName { get; set; }
        = string.Empty;

    public string ContentType { get; set; }
        = string.Empty;

    public int SortOrder { get; set; }
}