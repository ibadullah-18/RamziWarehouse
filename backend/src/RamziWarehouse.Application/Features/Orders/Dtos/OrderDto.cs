using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Application.Features.Orders.Dtos;

public sealed class OrderDto
{
    public Guid Id { get; init; }

    public string OrderNumber { get; init; } = string.Empty;

    public DateTime OrderDate { get; init; }

    public Guid CustomerId { get; init; }

    public string CustomerName { get; init; } = string.Empty;

    public Guid WarehouseId { get; init; }

    public string WarehouseName { get; init; } = string.Empty;

    public string? Note { get; init; }

    public OrderStatus Status { get; init; }

    public Guid CreatedByUserId { get; init; }

    public string CreatedByFullName { get; init; } = string.Empty;

    public Guid? PreparedByUserId { get; init; }

    public string? PreparedByFullName { get; init; }

    public DateTime? PreparationStartedAtUtc { get; init; }

    public DateTime? PreparedAtUtc { get; init; }

    public DateTime? CompletedAtUtc { get; init; }

    public DateTime? DeleteAfterUtc { get; init; }

    public DateTime CreatedAtUtc { get; init; }

    public DateTime? UpdatedAtUtc { get; init; }

    public IReadOnlyList<OrderItemDto> Items { get; init; } = [];

    public IReadOnlyList<OrderStatusHistoryDto> StatusHistory { get; init; }
        = [];
}