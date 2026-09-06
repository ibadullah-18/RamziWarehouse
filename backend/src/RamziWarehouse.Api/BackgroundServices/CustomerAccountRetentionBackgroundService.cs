using RamziWarehouse.Application.Abstractions.CustomerAccounts;

namespace RamziWarehouse.Api.BackgroundServices;

public sealed class CustomerAccountRetentionBackgroundService
    : BackgroundService
{
    private static readonly TimeSpan CleanupInterval =
        TimeSpan.FromHours(6);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CustomerAccountRetentionBackgroundService> _logger;

    public CustomerAccountRetentionBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<CustomerAccountRetentionBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var service = scope.ServiceProvider
                    .GetRequiredService<ICustomerAccountRetentionService>();

                var deletedCount = await service.CleanupExpiredEntriesAsync(
                    stoppingToken);

                if (deletedCount > 0)
                {
                    _logger.LogInformation(
                        "6 aylıq açot təmizlənməsi tamamlandı. Silinən: {Count}",
                        deletedCount);
                }
            }
            catch (OperationCanceledException)
                when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                _logger.LogError(
                    exception,
                    "6 aylıq açot təmizlənməsi zamanı xəta baş verdi.");
            }

            try
            {
                await Task.Delay(CleanupInterval, stoppingToken);
            }
            catch (OperationCanceledException)
                when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }
}
