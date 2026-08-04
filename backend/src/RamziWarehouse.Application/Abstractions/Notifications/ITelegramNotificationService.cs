using RamziWarehouse.Application.Common.Notifications;

namespace RamziWarehouse.Application.Abstractions.Notifications;

public interface ITelegramNotificationService
{
    Task SendTextAsync(
        TelegramChannel channel,
        string message,
        CancellationToken cancellationToken = default);
}