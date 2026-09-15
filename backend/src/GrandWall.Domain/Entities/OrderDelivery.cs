using GrandWall.Domain.Common;

namespace GrandWall.Domain.Entities;

public sealed class OrderDelivery : BaseEntity
{
    public Guid OrderId { get; set; }

    public Order Order { get; set; } = null!;

    public Guid DeliveredByUserId { get; set; }

    public User DeliveredByUser { get; set; } = null!;

    public DateTime StartedAtUtc { get; set; }
        = DateTime.UtcNow;

    public DateTime? DeliveredAtUtc { get; private set; }

    public string? Note { get; private set; }

    public ICollection<DeliveryPhoto> Photos { get; set; }
        = new List<DeliveryPhoto>();

    public void Complete(
        DateTime deliveredAtUtc,
        string? note)
    {
        if (DeliveredAtUtc.HasValue)
        {
            throw new InvalidOperationException(
                "This delivery has already been completed.");
        }

        if (deliveredAtUtc < StartedAtUtc)
        {
            throw new InvalidOperationException(
                "Delivery completion time cannot be " +
                "earlier than its start time.");
        }

        DeliveredAtUtc = deliveredAtUtc;
        Note = NormalizeOptional(note);
    }

    private static string? NormalizeOptional(
        string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}