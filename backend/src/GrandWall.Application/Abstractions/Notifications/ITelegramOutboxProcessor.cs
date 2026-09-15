namespace GrandWall.Application.Abstractions.Notifications;

public interface ITelegramOutboxProcessor
{
    Task<int> ProcessPendingAsync(
        CancellationToken cancellationToken = default);
}