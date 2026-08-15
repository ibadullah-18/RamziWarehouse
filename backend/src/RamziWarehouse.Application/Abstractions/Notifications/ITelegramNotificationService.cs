using RamziWarehouse.Application.Common.Notifications;

namespace RamziWarehouse.Application.Abstractions.Notifications;

public interface ITelegramNotificationService
{
    Task SendTextAsync(
        TelegramChannel channel,
        string message,
        CancellationToken cancellationToken = default);

    Task SendPhotosAsync(
        TelegramChannel channel,
        IReadOnlyCollection<TelegramPhotoContent> photos,
        CancellationToken cancellationToken = default);
}