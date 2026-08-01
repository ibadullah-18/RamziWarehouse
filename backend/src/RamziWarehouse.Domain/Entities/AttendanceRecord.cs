using RamziWarehouse.Domain.Common;

namespace RamziWarehouse.Domain.Entities;

public sealed class AttendanceRecord : ExpirableEntity
{
    public Guid UserId { get; set; }

    public User User { get; set; } = null!;

    public DateOnly WorkDate { get; set; }

    public DateTime CheckedInAtUtc { get; set; }

    public DateTime? CheckedOutAtUtc { get; private set; }

    public void CheckOut(DateTime checkedOutAtUtc)
    {
        if (CheckedOutAtUtc.HasValue)
        {
            throw new InvalidOperationException(
                "The employee has already checked out.");
        }

        if (checkedOutAtUtc <= CheckedInAtUtc)
        {
            throw new InvalidOperationException(
                "Check-out time must be after check-in time.");
        }

        CheckedOutAtUtc = checkedOutAtUtc;

        StartRetentionPeriod(checkedOutAtUtc);
    }
}