using Microsoft.EntityFrameworkCore;
using RamziWarehouse.Application.Abstractions.Notifications;
using RamziWarehouse.Infrastructure.Persistence;

namespace RamziWarehouse.Infrastructure.Notifications.Telegram.Outbox;

public sealed class TelegramOutboxProcessor
    : ITelegramOutboxProcessor
{
    private const int BatchSize = 20;
    private const int MaximumAttemptCount = 10;

    private static readonly TimeSpan ProcessingTimeout =
        TimeSpan.FromMinutes(5);

    private readonly AppDbContext _dbContext;
    private readonly ITelegramNotificationService
        _telegramNotificationService;

    private readonly TimeProvider _timeProvider;

    public TelegramOutboxProcessor(
        AppDbContext dbContext,
        ITelegramNotificationService telegramNotificationService,
        TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _telegramNotificationService =
            telegramNotificationService;

        _timeProvider = timeProvider;
    }

    public async Task<int> ProcessPendingAsync(
        CancellationToken cancellationToken = default)
    {
        var nowUtc = GetUtcNow();

        await DeleteExpiredMessagesAsync(
            nowUtc,
            cancellationToken);

        await RecoverTimedOutMessagesAsync(
            nowUtc,
            cancellationToken);

        var messageIds = await _dbContext
            .TelegramOutboxMessages
            .AsNoTracking()
            .Where(message =>
                (message.Status == TelegramOutboxStatus.Pending ||
                 message.Status == TelegramOutboxStatus.Failed) &&
                message.AttemptCount < MaximumAttemptCount &&
                message.NextAttemptAtUtc <= nowUtc)
            .OrderBy(message => message.NextAttemptAtUtc)
            .ThenBy(message => message.CreatedAtUtc)
            .Select(message => message.Id)
            .Take(BatchSize)
            .ToListAsync(cancellationToken);

        var sentMessageCount = 0;

        foreach (var messageId in messageIds)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var wasSent = await ProcessMessageAsync(
                messageId,
                cancellationToken);

            if (wasSent)
            {
                sentMessageCount++;
            }
        }

        return sentMessageCount;
    }

    private async Task<bool> ProcessMessageAsync(
        Guid messageId,
        CancellationToken cancellationToken)
    {
        var message = await _dbContext
            .TelegramOutboxMessages
            .Include(outboxMessage => outboxMessage.Photos)
            .FirstOrDefaultAsync(
                outboxMessage =>
                    outboxMessage.Id == messageId,
                cancellationToken);

        if (message is null)
        {
            return false;
        }

        var nowUtc = GetUtcNow();

        if (message.Status is not TelegramOutboxStatus.Pending and
            not TelegramOutboxStatus.Failed)
        {
            return false;
        }

        if (message.NextAttemptAtUtc > nowUtc)
        {
            return false;
        }

        message.MarkAsProcessing(nowUtc);

        try
        {
            await _dbContext.SaveChangesAsync(
                cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            _dbContext.Entry(message).State =
                EntityState.Detached;

            return false;
        }

        try
        {
            if (message.Photos.Count > 0)
            {
                throw new InvalidOperationException(
                    "Telegram photo delivery is not enabled yet.");
            }

            await _telegramNotificationService.SendTextAsync(
                message.Channel,
                message.Text,
                cancellationToken);
        }
        catch (OperationCanceledException)
            when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            await MarkAsFailedAsync(
                message,
                GetSafeError(exception),
                cancellationToken);

            return false;
        }

        message.MarkAsSent(GetUtcNow());

        try
        {
            await _dbContext.SaveChangesAsync(
                cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            _dbContext.Entry(message).State =
                EntityState.Detached;

            return false;
        }

        return true;
    }

    private async Task MarkAsFailedAsync(
        TelegramOutboxMessage message,
        string error,
        CancellationToken cancellationToken)
    {
        var failedAtUtc = GetUtcNow();

        if (message.AttemptCount >= MaximumAttemptCount)
        {
            message.MarkAsAbandoned(
                error,
                failedAtUtc);
        }
        else
        {
            message.MarkAsFailed(
                error,
                failedAtUtc.Add(
                    GetRetryDelay(message.AttemptCount)));
        }

        try
        {
            await _dbContext.SaveChangesAsync(
                cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            _dbContext.Entry(message).State =
                EntityState.Detached;
        }
    }

    private async Task RecoverTimedOutMessagesAsync(
        DateTime nowUtc,
        CancellationToken cancellationToken)
    {
        var timeoutLimitUtc =
            nowUtc.Subtract(ProcessingTimeout);

        var timedOutMessages = await _dbContext
            .TelegramOutboxMessages
            .Where(message =>
                message.Status ==
                    TelegramOutboxStatus.Processing &&
                message.LastAttemptAtUtc.HasValue &&
                message.LastAttemptAtUtc.Value <=
                    timeoutLimitUtc)
            .ToListAsync(cancellationToken);

        if (timedOutMessages.Count == 0)
        {
            return;
        }

        foreach (var timedOutMessage in timedOutMessages)
        {
            timedOutMessage.RecoverAfterTimeout(nowUtc);
        }

        try
        {
            await _dbContext.SaveChangesAsync(
                cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            _dbContext.ChangeTracker.Clear();
        }
    }

    private async Task DeleteExpiredMessagesAsync(
        DateTime nowUtc,
        CancellationToken cancellationToken)
    {
        await _dbContext.TelegramOutboxMessages
            .Where(message =>
                message.DeleteAfterUtc.HasValue &&
                message.DeleteAfterUtc.Value <= nowUtc)
            .ExecuteDeleteAsync(cancellationToken);
    }

    private static TimeSpan GetRetryDelay(int attemptCount)
    {
        return attemptCount switch
        {
            1 => TimeSpan.FromMinutes(1),
            2 => TimeSpan.FromMinutes(5),
            3 => TimeSpan.FromMinutes(15),
            4 => TimeSpan.FromMinutes(30),
            5 => TimeSpan.FromHours(1),
            _ => TimeSpan.FromHours(6)
        };
    }

    private static string GetSafeError(Exception exception)
    {
        return exception switch
        {
            HttpRequestException =>
                "Telegram serveri ilə bağlantı qurulmadı.",

            TaskCanceledException =>
                "Telegram sorğusunun vaxtı bitdi.",

            InvalidOperationException =>
                exception.Message,

            ArgumentException =>
                exception.Message,

            _ => "Telegram mesajı göndərilərkən " +
                 "gözlənilməz xəta baş verdi."
        };
    }

    private DateTime GetUtcNow()
    {
        return _timeProvider
            .GetUtcNow()
            .UtcDateTime;
    }
}