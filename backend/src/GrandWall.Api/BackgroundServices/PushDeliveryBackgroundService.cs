using GrandWall.Infrastructure.Notifications.Push;
namespace GrandWall.Api.BackgroundServices;
public sealed class PushDeliveryBackgroundService(IServiceScopeFactory scopes,ILogger<PushDeliveryBackgroundService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer=new PeriodicTimer(TimeSpan.FromSeconds(15));
        while(await timer.WaitForNextTickAsync(stoppingToken))
        {
            try {using var scope=scopes.CreateScope();await scope.ServiceProvider.GetRequiredService<PushDeliveryProcessor>().ProcessAsync(stoppingToken);}
            catch(OperationCanceledException) when(stoppingToken.IsCancellationRequested){break;}
            catch(Exception ex){logger.LogWarning("Push processing failed: {Type}",ex.GetType().Name);}
        }
    }
}
