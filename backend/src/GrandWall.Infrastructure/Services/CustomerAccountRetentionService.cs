using GrandWall.Application.Abstractions.CustomerAccounts;

namespace GrandWall.Infrastructure.Services;

// Ledger and actor history are financial records; do not compact or delete them.
public sealed class CustomerAccountRetentionService : ICustomerAccountRetentionService
{
    public Task<int> CleanupExpiredEntriesAsync(CancellationToken cancellationToken = default)
        => Task.FromResult(0);
}
