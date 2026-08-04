using RamziWarehouse.Application.Abstractions.Retention;

namespace RamziWarehouse.Api.BackgroundServices;

public sealed class DataRetentionBackgroundService
    : BackgroundService
{
    private static readonly TimeSpan CleanupInterval =
        TimeSpan.FromHours(6);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DataRetentionBackgroundService> _logger;

    public DataRetentionBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<DataRetentionBackgroundService> logger)
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
                using var scope =
                    _scopeFactory.CreateScope();

                var cleanupService =
                    scope.ServiceProvider
                        .GetRequiredService<
                            IDataRetentionCleanupService>();

                var result =
                    await cleanupService.CleanupExpiredDataAsync(
                        stoppingToken);

                if (result.TotalDeleted > 0)
                {
                    _logger.LogInformation(
                        "40 günlük təmizləmə tamamlandı. " +
                        "Sifariş: {Orders}, " +
                        "Vazvrad: {Returns}, " +
                        "İş qeydi: {Attendance}",
                        result.DeletedOrders,
                        result.DeletedProductReturns,
                        result.DeletedAttendanceRecords);
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
                    "40 günlük avtomatik təmizləmə zamanı xəta baş verdi.");
            }

            try
            {
                await Task.Delay(
                    CleanupInterval,
                    stoppingToken);
            }
            catch (OperationCanceledException)
                when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }
}