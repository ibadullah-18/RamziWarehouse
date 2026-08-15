using RamziWarehouse.Application.Abstractions.Notifications;
using RamziWarehouse.Application.Common.Notifications;
using RamziWarehouse.Infrastructure.Persistence;

namespace RamziWarehouse.Infrastructure.Notifications.Telegram.Outbox;

public sealed class TelegramOutboxService
    : ITelegramOutboxService
{
    private const int MaximumTextLength = 4096;
    private const int MaximumEntityTypeLength = 100;
    private const int MaximumPublicIdLength = 500;
    private const int MaximumFileNameLength = 255;
    private const int MaximumContentTypeLength = 100;

    private readonly AppDbContext _dbContext;
    private readonly TimeProvider _timeProvider;

    public TelegramOutboxService(
        AppDbContext dbContext,
        TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _timeProvider = timeProvider;
    }

    public async Task<Guid> EnqueueAsync(
        TelegramChannel channel,
        string text,
        string relatedEntityType,
        Guid relatedEntityId,
        IReadOnlyCollection<TelegramOutboxPhotoRequest>? photos = null,
        CancellationToken cancellationToken = default)
    {
        ValidateChannel(channel);

        text = NormalizeRequiredText(
            text,
            nameof(text),
            MaximumTextLength);

        relatedEntityType = NormalizeRequiredText(
            relatedEntityType,
            nameof(relatedEntityType),
            MaximumEntityTypeLength);

        if (relatedEntityId == Guid.Empty)
        {
            throw new ArgumentException(
                "Related entity ID cannot be empty.",
                nameof(relatedEntityId));
        }

        var outboxMessage = new TelegramOutboxMessage
        {
            Channel = channel,
            Text = text,
            RelatedEntityType = relatedEntityType,
            RelatedEntityId = relatedEntityId,
            NextAttemptAtUtc = _timeProvider
                .GetUtcNow()
                .UtcDateTime
        };

        AddPhotos(
            outboxMessage,
            photos);

        await _dbContext.TelegramOutboxMessages.AddAsync(
            outboxMessage,
            cancellationToken);

        // Burada SaveChanges çağırılmır.
        // Əsas əməliyyatı yerinə yetirən service çağıracaq.
        return outboxMessage.Id;
    }

    private static void AddPhotos(
        TelegramOutboxMessage outboxMessage,
        IReadOnlyCollection<TelegramOutboxPhotoRequest>? photos)
    {
        if (photos is null || photos.Count == 0)
        {
            return;
        }

        var sortOrder = 0;

        foreach (var photo in photos)
        {
            if (photo is null)
            {
                throw new ArgumentException(
                    "Telegram photo information cannot be null.",
                    nameof(photos));
            }

            var publicId = NormalizeRequiredText(
                photo.CloudinaryPublicId,
                nameof(photo.CloudinaryPublicId),
                MaximumPublicIdLength);

            var originalFileName = NormalizeRequiredText(
                Path.GetFileName(photo.OriginalFileName),
                nameof(photo.OriginalFileName),
                MaximumFileNameLength);

            var contentType = NormalizeRequiredText(
                photo.ContentType,
                nameof(photo.ContentType),
                MaximumContentTypeLength);

            outboxMessage.Photos.Add(
                new TelegramOutboxPhoto
                {
                    CloudinaryPublicId = publicId,
                    OriginalFileName = originalFileName,
                    ContentType = contentType,
                    SortOrder = sortOrder
                });

            sortOrder++;
        }
    }

    private static void ValidateChannel(
        TelegramChannel channel)
    {
        if (!Enum.IsDefined(
                typeof(TelegramChannel),
                channel))
        {
            throw new ArgumentOutOfRangeException(
                nameof(channel),
                channel,
                "Unknown Telegram channel.");
        }
    }

    private static string NormalizeRequiredText(
        string value,
        string parameterName,
        int maximumLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException(
                $"{parameterName} cannot be empty.",
                parameterName);
        }

        value = value.Trim();

        if (value.Length > maximumLength)
        {
            throw new ArgumentException(
                $"{parameterName} cannot exceed " +
                $"{maximumLength} characters.",
                parameterName);
        }

        return value;
    }
}