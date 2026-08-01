namespace RamziWarehouse.Domain.Common;

public abstract class ExpirableEntity : BaseEntity
{
    public const int RetentionDays = 40;

    public DateTime? CompletedAtUtc { get; protected set; }

    public DateTime? DeleteAfterUtc { get; protected set; }

    protected void StartRetentionPeriod(DateTime completedAtUtc)
    {
        CompletedAtUtc = completedAtUtc;
        DeleteAfterUtc = completedAtUtc.AddDays(RetentionDays);
    }
}