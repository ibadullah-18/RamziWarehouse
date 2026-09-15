using GrandWall.Domain.Enums;

namespace GrandWall.Application.Features.Orders.Dtos;

public sealed class OrderQueryDto
{
    public string? Search { get; init; }

    public Guid? CustomerId { get; init; }

    public Guid? WarehouseId { get; init; }

    public OrderStatus? Status { get; init; }

    public DateTime? FromDate { get; init; }

    public DateTime? ToDate { get; init; }

    public int PageNumber { get; init; } = 1;

    public int PageSize { get; init; } = 20;
}