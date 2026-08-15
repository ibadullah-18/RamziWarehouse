using RamziWarehouse.Application.Abstractions.Notifications;

namespace RamziWarehouse.Api.BackgroundServices;

public sealed class TelegramOutboxBackgroundService
    : BackgroundService
{
    private static readonly TimeSpan Interval =
        TimeSpan.FromSeconds(15);

    private readonly IServiceScopeFactory _scopeFactory;

    private readonly ILogger<TelegramOutboxBackgroundService>
        _logger;

    public TelegramOutboxBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<TelegramOutboxBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        await ProcessAsync(stoppingToken);

        using var timer = new PeriodicTimer(Interval);

        while (await timer.WaitForNextTickAsync(
                   stoppingToken))
        {
            await ProcessAsync(stoppingToken);
        }
    }

    private async Task ProcessAsync(
        CancellationToken cancellationToken)
    {
        try
        {
            await using var scope =
                _scopeFactory.CreateAsyncScope();

            var processor = scope.ServiceProvider
                .GetRequiredService<
                    ITelegramOutboxProcessor>();

            var sentMessageCount =
                await processor.ProcessPendingAsync(
                    cancellationToken);

            if (sentMessageCount > 0)
            {
                _logger.LogInformation(
                    "Telegram Outbox sent {MessageCount} message(s).",
                    sentMessageCount);
            }
        }
        catch (OperationCanceledException)
            when (cancellationToken.IsCancellationRequested)
        {
            // API dayandırılır.
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Telegram Outbox background processing failed.");
        }
    }
}