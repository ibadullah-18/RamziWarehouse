using RamziWarehouse.Domain.Common;
using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Domain.Entities;

public sealed class OrderStatusHistory : BaseEntity
{
    public Guid OrderId { get; set; }

    public Order Order { get; set; } = null!;

    public OrderStatus? PreviousStatus { get; set; }

    public OrderStatus NewStatus { get; set; }

    public Guid ChangedByUserId { get; set; }

    public User ChangedByUser { get; set; } = null!;

    public string? Note { get; set; }
}