using GrandWall.Application.Common.Notifications;
using GrandWall.Domain.Common;

namespace GrandWall.Infrastructure.Notifications.Telegram.Outbox;

public sealed class TelegramOutboxMessage : BaseEntity
{
    public const int RetentionDays = 40;

    public TelegramChannel Channel { get; set; }

    public string Text { get; set; } = string.Empty;

    public TelegramOutboxStatus Status { get; private set; }
        = TelegramOutboxStatus.Pending;

    public int AttemptCount { get; private set; }

    public DateTime NextAttemptAtUtc { get; set; }
        = DateTime.UtcNow;

    public DateTime? LastAttemptAtUtc { get; private set; }

    public DateTime? SentAtUtc { get; private set; }

    public DateTime? DeleteAfterUtc { get; private set; }

    public string? LastError { get; private set; }

    public string? RelatedEntityType { get; set; }

    public Guid? RelatedEntityId { get; set; }

    public byte[] RowVersion { get; private set; }
        = Array.Empty<byte>();

    public ICollection<TelegramOutboxPhoto> Photos { get; set; }
        = new List<TelegramOutboxPhoto>();

    public void MarkAsProcessing(DateTime attemptedAtUtc)
    {
        if (Status is not TelegramOutboxStatus.Pending and
            not TelegramOutboxStatus.Failed)
        {
            throw new InvalidOperationException(
                "Only a pending or failed message can be processed.");
        }

        Status = TelegramOutboxStatus.Processing;
        AttemptCount++;
        LastAttemptAtUtc = attemptedAtUtc;
        LastError = null;
    }

    public void MarkAsSent(DateTime sentAtUtc)
    {
        if (Status != TelegramOutboxStatus.Processing)
        {
            throw new InvalidOperationException(
                "Only a processing message can be marked as sent.");
        }

        Status = TelegramOutboxStatus.Sent;
        SentAtUtc = sentAtUtc;
        LastError = null;
        DeleteAfterUtc = sentAtUtc.AddDays(RetentionDays);
    }

    public void MarkAsFailed(
        string error,
        DateTime nextAttemptAtUtc)
    {
        if (Status != TelegramOutboxStatus.Processing)
        {
            throw new InvalidOperationException(
                "Only a processing message can be marked as failed.");
        }

        Status = TelegramOutboxStatus.Failed;
        LastError = NormalizeError(error);
        NextAttemptAtUtc = nextAttemptAtUtc;
    }

    public void MarkAsAbandoned(
        string error,
        DateTime abandonedAtUtc)
    {
        if (Status != TelegramOutboxStatus.Processing)
        {
            throw new InvalidOperationException(
                "Only a processing message can be abandoned.");
        }

        Status = TelegramOutboxStatus.Abandoned;
        LastError = NormalizeError(error);
        DeleteAfterUtc = abandonedAtUtc.AddDays(RetentionDays);
    }

    public void RecoverAfterTimeout(DateTime recoveredAtUtc)
    {
        if (Status != TelegramOutboxStatus.Processing)
        {
            throw new InvalidOperationException(
                "Only a processing message can be recovered.");
        }

        Status = TelegramOutboxStatus.Failed;
        LastError = "Telegram processing operation timed out.";
        NextAttemptAtUtc = recoveredAtUtc;
    }

    private static string NormalizeError(string error)
    {
        const int maximumLength = 2000;

        if (string.IsNullOrWhiteSpace(error))
        {
            return "Unknown Telegram error.";
        }

        error = error.Trim();

        return error.Length <= maximumLength
            ? error
            : error[..maximumLength];
    }
}