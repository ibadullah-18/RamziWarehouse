using RamziWarehouse.Application.Common.Retention;

namespace RamziWarehouse.Application.Abstractions.Retention;

public interface IDataRetentionCleanupService
{
    Task<RetentionCleanupResultDto> CleanupExpiredDataAsync(
        CancellationToken cancellationToken = default);
}