namespace RamziWarehouse.Application.Abstractions.CustomerAccounts;

public interface ICustomerAccountRetentionService
{
    Task<int> CleanupExpiredEntriesAsync(
        CancellationToken cancellationToken = default);
}
