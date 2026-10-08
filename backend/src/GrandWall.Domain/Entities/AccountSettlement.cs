namespace GrandWall.Domain.Entities;
public sealed class AccountSettlement
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public DateOnly BusinessDate { get; set; }
    public decimal Cash { get; set; }
    public decimal Card { get; set; }
    public decimal Bonus { get; set; }
    public Guid? ProductReturnId { get; set; }
    public string? Note { get; set; }
    public Guid RecordedByUserId { get; set; }
}
