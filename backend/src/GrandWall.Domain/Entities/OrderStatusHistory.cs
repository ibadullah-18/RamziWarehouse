using GrandWall.Domain.Common;
using GrandWall.Domain.Enums;

namespace GrandWall.Domain.Entities;

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