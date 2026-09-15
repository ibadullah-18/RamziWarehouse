using Microsoft.EntityFrameworkCore;
using GrandWall.Application.Abstractions.Dashboard;
using GrandWall.Application.Features.Dashboard.Dtos;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Persistence;

namespace GrandWall.Infrastructure.Services;

public sealed class DashboardService : IDashboardService
{
    private static readonly TimeZoneInfo BakuTimeZone =
        FindBakuTimeZone();

    private readonly AppDbContext _dbContext;
    private readonly TimeProvider _timeProvider;

    public DashboardService(
        AppDbContext dbContext,
        TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _timeProvider = timeProvider;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(
        CancellationToken cancellationToken = default)
    {
        var nowUtc =
            _timeProvider.GetUtcNow().UtcDateTime;

        var localNow = TimeZoneInfo.ConvertTimeFromUtc(
            nowUtc,
            BakuTimeZone);

        var startOfTodayLocal = DateTime.SpecifyKind(
            localNow.Date,
            DateTimeKind.Unspecified);

        var startOfTomorrowLocal =
            startOfTodayLocal.AddDays(1);

        var startOfTodayUtc =
            TimeZoneInfo.ConvertTimeToUtc(
                startOfTodayLocal,
                BakuTimeZone);

        var startOfTomorrowUtc =
            TimeZoneInfo.ConvertTimeToUtc(
                startOfTomorrowLocal,
                BakuTimeZone);

        var todayOrdersCount =
            await _dbContext.Orders.CountAsync(
                order =>
                    order.OrderDateUtc >= startOfTodayUtc &&
                    order.OrderDateUtc < startOfTomorrowUtc,
                cancellationToken);

        var waitingPreparationCount =
            await _dbContext.Orders.CountAsync(
                order =>
                    order.Status == OrderStatus.Created ||
                    order.Status == OrderStatus.InPreparation,
                cancellationToken);

        var readyForDeliveryCount =
            await _dbContext.Orders.CountAsync(
                order =>
                    order.Status ==
                    OrderStatus.ReadyForDelivery,
                cancellationToken);

        var pendingReturnsCount =
            await _dbContext
                .Set<ProductReturn>()
                .CountAsync(
                    productReturn =>
                        productReturn.Status ==
                        ReturnStatus.Pending,
                    cancellationToken);

        return new DashboardSummaryDto
        {
            TodayOrdersCount = todayOrdersCount,

            WaitingPreparationCount =
                waitingPreparationCount,

            ReadyForDeliveryCount =
                readyForDeliveryCount,

            PendingReturnsCount =
                pendingReturnsCount,

            GeneratedAtUtc = nowUtc
        };
    }

    private static TimeZoneInfo FindBakuTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(
                "Asia/Baku");
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById(
                "Azerbaijan Standard Time");
        }
    }
}