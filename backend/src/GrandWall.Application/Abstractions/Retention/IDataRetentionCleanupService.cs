using GrandWall.Application.Common.Retention;

namespace GrandWall.Application.Abstractions.Retention;

public interface IDataRetentionCleanupService
{
    Task<RetentionCleanupResultDto> CleanupExpiredDataAsync(
        CancellationToken cancellationToken = default);
}