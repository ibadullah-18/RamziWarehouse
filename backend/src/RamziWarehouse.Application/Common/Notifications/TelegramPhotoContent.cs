namespace RamziWarehouse.Application.Common.Notifications;

public sealed class TelegramPhotoContent
{
    public byte[] Content { get; init; }
        = Array.Empty<byte>();

    public string FileName { get; init; }
        = string.Empty;

    public string ContentType { get; init; }
        = string.Empty;
}