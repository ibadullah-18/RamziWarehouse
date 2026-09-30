namespace GrandWall.Domain.Entities;

public sealed class AccountDayClosure
{
    public DateOnly BusinessDate { get; set; }
    public Guid RecordedByUserId { get; set; }
    public string RecordedByFullName { get; set; } = string.Empty;
    public DateTime ClosedAtUtc { get; set; }
}
