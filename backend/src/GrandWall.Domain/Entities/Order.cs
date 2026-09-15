using GrandWall.Domain.Common;
using GrandWall.Domain.Enums;

namespace GrandWall.Domain.Entities;

public sealed class Order : ExpirableEntity
{
    public string OrderNumber { get; set; } = string.Empty;

    public DateTime OrderDateUtc { get; set; } = DateTime.UtcNow;

    public Guid CustomerId { get; set; }

    public Customer Customer { get; set; } = null!;

    public Guid WarehouseId { get; set; }

    public Warehouse Warehouse { get; set; } = null!;

    public string? AdditionalNote { get; set; }

    public OrderStatus Status { get; private set; } = OrderStatus.Created;

    public Guid CreatedByUserId { get; set; }

    public User CreatedByUser { get; set; } = null!;

    public Guid? PreparedByUserId { get; private set; }

    public User? PreparedByUser { get; set; }

    public DateTime? PreparationStartedAtUtc { get; private set; }

    public DateTime? PreparedAtUtc { get; private set; }

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();

    public ICollection<OrderPreparationPhoto> PreparationPhotos { get; set; }
        = new List<OrderPreparationPhoto>();

    public OrderDelivery? Delivery { get; set; }

    public ICollection<OrderStatusHistory> StatusHistory { get; set; }
        = new List<OrderStatusHistory>();

    public void StartPreparation(Guid workerUserId, DateTime startedAtUtc)
    {
        if (Status != OrderStatus.Created)
        {
            throw new InvalidOperationException(
                "Only a newly created order can be prepared.");
        }

        PreparedByUserId = workerUserId;
        PreparationStartedAtUtc = startedAtUtc;
        Status = OrderStatus.InPreparation;
    }

    public void CompletePreparation(DateTime preparedAtUtc)
    {
        if (Status != OrderStatus.InPreparation)
        {
            throw new InvalidOperationException(
                "The order is not currently in preparation.");
        }

        PreparedAtUtc = preparedAtUtc;
        Status = OrderStatus.ReadyForDelivery;
    }

    public void MarkAsDelivered(DateTime deliveredAtUtc)
    {
        if (Status != OrderStatus.ReadyForDelivery)
        {
            throw new InvalidOperationException(
                "Only an order ready for delivery can be delivered.");
        }

        Status = OrderStatus.Delivered;
        StartRetentionPeriod(deliveredAtUtc);
    }

    public void Cancel(DateTime cancelledAtUtc)
    {
        if (Status is OrderStatus.Delivered or OrderStatus.Cancelled)
        {
            throw new InvalidOperationException(
                "This order cannot be cancelled.");
        }

        Status = OrderStatus.Cancelled;
        StartRetentionPeriod(cancelledAtUtc);
    }
}