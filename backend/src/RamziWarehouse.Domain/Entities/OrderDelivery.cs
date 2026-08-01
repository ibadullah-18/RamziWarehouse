using RamziWarehouse.Domain.Common;

namespace RamziWarehouse.Domain.Entities;

public sealed class OrderDelivery : BaseEntity
{
    public Guid OrderId { get; set; }

    public Order Order { get; set; } = null!;

    public Guid DeliveredByUserId { get; set; }

    public User DeliveredByUser { get; set; } = null!;

    public DateTime DeliveredAtUtc { get; set; }

    public string? Note { get; set; }

    public ICollection<DeliveryPhoto> Photos { get; set; }
        = new List<DeliveryPhoto>();
}