using GrandWall.Domain.Enums;

namespace GrandWall.Application.Features.Orders.Dtos;

public sealed class OrderListItemDto
{
    public Guid Id { get; init; }

    public string OrderNumber { get; init; } = string.Empty;

    public DateTime OrderDate { get; init; }

    public Guid CustomerId { get; init; }

    public string CustomerName { get; init; } = string.Empty;

    public Guid WarehouseId { get; init; }

    public string WarehouseName { get; init; } = string.Empty;

    public OrderStatus Status { get; init; }

    public int ItemLineCount { get; init; }

    public int TotalQuantity { get; init; }

    public Guid CreatedByUserId { get; init; }

    public string CreatedByFullName { get; init; } = string.Empty;

    public Guid? PreparedByUserId { get; init; }

    public string? PreparedByFullName { get; init; }

    public DateTime CreatedAtUtc { get; init; }

    public DateTime? CompletedAtUtc { get; init; }

    public DateTime? DeleteAfterUtc { get; init; }
}