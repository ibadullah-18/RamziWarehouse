namespace GrandWall.Domain.Entities;

/// <summary>An açot day: started by an operator, finished with "yekun", never reopened after the date passes.</summary>
public sealed class AccountDay
{
    public DateOnly BusinessDate { get; set; }
    public DateTime StartedAtUtc { get; set; }
    public Guid StartedByUserId { get; set; }
    public string StartedByFullName { get; set; } = string.Empty;
    public DateTime? ClosedAtUtc { get; set; }
    public Guid? ClosedByUserId { get; set; }
    public string? ClosedByFullName { get; set; }
}
