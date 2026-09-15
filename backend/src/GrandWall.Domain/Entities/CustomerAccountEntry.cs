using GrandWall.Domain.Common;
using GrandWall.Domain.Enums;

namespace GrandWall.Domain.Entities;

public sealed class CustomerAccountEntry : BaseEntity
{
    public Guid CustomerId { get; set; }

    public Customer Customer { get; set; } = null!;

    public CustomerAccountEntryType EntryType { get; set; }

    public decimal Amount { get; set; }

    public DateOnly BusinessDate { get; set; }

    public string? Note { get; set; }

    public Guid RecordedByUserId { get; set; }

    public User RecordedByUser { get; set; } = null!;

    public string RecordedByFullName { get; set; } = string.Empty;

    public UserRole RecordedByRole { get; set; }
}
