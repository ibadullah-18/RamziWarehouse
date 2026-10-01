using GrandWall.Domain.Common;
namespace GrandWall.Domain.Entities;
public sealed class AccountEntryAudit : BaseEntity
{
    public Guid CustomerId { get; set; }
    public Guid EntryId { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}