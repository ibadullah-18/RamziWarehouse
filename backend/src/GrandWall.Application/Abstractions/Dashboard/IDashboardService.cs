using GrandWall.Application.Features.Dashboard.Dtos;

namespace GrandWall.Application.Abstractions.Dashboard;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(
        CancellationToken cancellationToken = default);
}