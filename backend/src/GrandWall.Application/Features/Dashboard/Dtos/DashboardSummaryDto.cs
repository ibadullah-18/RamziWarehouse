namespace GrandWall.Application.Features.Dashboard.Dtos;

public sealed class DashboardSummaryDto
{
    public int TodayOrdersCount { get; init; }

    public int WaitingPreparationCount { get; init; }

    public int ReadyForDeliveryCount { get; init; }

    public int PendingReturnsCount { get; init; }

    public DateTime GeneratedAtUtc { get; init; }
}