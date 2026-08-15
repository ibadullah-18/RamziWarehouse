namespace RamziWarehouse.Application.Common.Notifications;

public sealed class TelegramOutboxPhotoRequest
{
    public string CloudinaryPublicId { get; init; }
        = string.Empty;

    public string OriginalFileName { get; init; }
        = string.Empty;

    public string ContentType { get; init; }
        = string.Empty;
}