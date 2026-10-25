namespace GrandWall.Domain.Entities;

/// <summary>
/// One "finish this customer's açot" action: what was received (cash/card), the bonus and
/// the returns credited at that moment, and whether the unpaid daily debt stays for tomorrow.
/// </summary>
public sealed class AccountSettlement
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public DateOnly BusinessDate { get; set; }
    public decimal Cash { get; set; }
    public decimal Card { get; set; }
    public decimal Bonus { get; set; }
    public bool CarryToTomorrow { get; set; }

    /// <summary>Canonical "returnId:amount;..." text, used to recognise a repeated request.</summary>
    public string? ReturnsKey { get; set; }
    public string? Note { get; set; }
    public Guid RecordedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
