// ==========================================================================
// GrandWall - AÃ§ot Modulu - GecÉ™ Rollover Servisi
// HÉ™r gecÉ™ (00:05) iÅŸÉ™ dÃ¼ÅŸÃ¼r: N gÃ¼ndÃ¼r (default 5) Ã¶dÉ™nilmÉ™yÉ™n gÃ¼ndÉ™lik
// borclarÄ± "kÃ¶hnÉ™ borc"a keÃ§irir. Program.cs-dÉ™ bir sÉ™tirlÉ™ qeydiyyata al:
//     builder.Services.AddHostedService<DebtRolloverBackgroundService>();
// ==========================================================================

using GrandWall.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GrandWall.Services;

public class DebtRolloverBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DebtRolloverBackgroundService> _logger;

    public DebtRolloverBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<DebtRolloverBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // server ilk aÃ§Ä±landa bir dÉ™fÉ™ dÉ™ iÅŸlÉ™tmÉ™k faydalÄ±dÄ±r (server bir neÃ§É™ gÃ¼n baÄŸlÄ± qalÄ±bsa)
        await RunRolloverAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTimeOffset.Now;
            var nextRun = now.Date.AddDays(1).AddMinutes(5); // sabahÄ±n 00:05-i (yerli vaxt)
            var delay = nextRun - now;
            if (delay < TimeSpan.Zero) delay = TimeSpan.FromMinutes(1);

            try
            {
                await Task.Delay(delay, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }

            await RunRolloverAsync(stoppingToken);
        }
    }

    private async Task RunRolloverAsync(CancellationToken ct)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>(); // TODO: Ã¶z DbContext
            var settingsProvider = scope.ServiceProvider.GetRequiredService<IDebtSettingsProvider>();

            var settings = await settingsProvider.GetAsync();
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var cutoff = today.AddDays(-settings.RolloverAfterDays);

            var expired = await db.Set<DailyDebt>()
                .Where(d => d.Status != DebtStatus.Paid
                         && d.Status != DebtStatus.RolledOver
                         && d.DebtDate <= cutoff)
                .ToListAsync(ct);

            if (expired.Count == 0) return;

            foreach (var debt in expired)
            {
                var account = await db.Set<CustomerDebtAccount>().FindAsync(new object[] { debt.CustomerId }, ct)
                    ?? new CustomerDebtAccount { CustomerId = debt.CustomerId };

                account.OldDebtBalance += debt.RemainingAmount;
                debt.Status = DebtStatus.RolledOver;
                debt.RolledOverAt = DateTimeOffset.UtcNow;

                db.Update(account);
            }

            await db.SaveChangesAsync(ct);
            _logger.LogInformation("Rollover: {Count} gÃ¼ndÉ™lik borc kÃ¶hnÉ™ borca keÃ§irildi.", expired.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Debt rollover zamanÄ± xÉ™ta baÅŸ verdi.");
        }
    }
}
