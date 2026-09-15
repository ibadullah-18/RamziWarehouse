using GrandWall.Application.Common.Notifications;

namespace GrandWall.Application.Abstractions.Notifications;

public interface ITelegramOutboxService
{
    Task<Guid> EnqueueAsync(
        TelegramChannel channel,
        string text,
        string relatedEntityType,
        Guid relatedEntityId,
        IReadOnlyCollection<TelegramOutboxPhotoRequest>? photos = null,
        CancellationToken cancellationToken = default);
}