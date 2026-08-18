using RamziWarehouse.Application.Features.Dashboard.Dtos;

namespace RamziWarehouse.Application.Abstractions.Dashboard;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(
        CancellationToken cancellationToken = default);
}