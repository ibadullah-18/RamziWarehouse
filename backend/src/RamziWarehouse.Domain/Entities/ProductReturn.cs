using RamziWarehouse.Domain.Common;
using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Domain.Entities;

public sealed class ProductReturn : ExpirableEntity
{
    public DateTime ReturnDateUtc { get; set; } = DateTime.UtcNow;

    public Guid CustomerId { get; set; }

    public Customer Customer { get; set; } = null!;

    public Guid WarehouseId { get; set; }

    public Warehouse Warehouse { get; set; } = null!;

    public string? AdditionalNote { get; set; }

    public ReturnStatus Status { get; private set; }
        = ReturnStatus.Pending;

    public Guid CreatedByUserId { get; set; }

    public User CreatedByUser { get; set; } = null!;

    public Guid? ProcessedByUserId { get; private set; }

    public User? ProcessedByUser { get; set; }

    public DateTime? ProcessedAtUtc { get; private set; }

    public ICollection<ProductReturnItem> Items { get; set; }
        = new List<ProductReturnItem>();

    public ICollection<ProductReturnPhoto> Photos { get; set; }
        = new List<ProductReturnPhoto>();

    public ICollection<ProductReturnStatusHistory> StatusHistory
    { get; set; } = new List<ProductReturnStatusHistory>();

    public void Submit()
    {
        if (Status != ReturnStatus.Pending)
        {
            throw new InvalidOperationException(
                "Only a pending return can be submitted.");
        }

        Status = ReturnStatus.Submitted;
    }

    public void Complete(
        Guid processedByUserId,
        DateTime completedAtUtc)
    {
        if (Status != ReturnStatus.Submitted)
        {
            throw new InvalidOperationException(
                "Only a submitted return can be completed.");
        }

        ProcessedByUserId = processedByUserId;
        ProcessedAtUtc = completedAtUtc;
        Status = ReturnStatus.Completed;

        StartRetentionPeriod(completedAtUtc);
    }

    public void Cancel(
        Guid processedByUserId,
        DateTime cancelledAtUtc)
    {
        if (Status != ReturnStatus.Pending &&
            Status != ReturnStatus.Submitted)
        {
            throw new InvalidOperationException(
                "Only a pending or submitted return can be cancelled.");
        }

        ProcessedByUserId = processedByUserId;
        ProcessedAtUtc = cancelledAtUtc;
        Status = ReturnStatus.Cancelled;

        StartRetentionPeriod(cancelledAtUtc);
    }
}