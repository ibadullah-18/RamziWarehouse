namespace GrandWall.Domain.Entities;

/// <summary>
/// A Sədərək customer's return price for wallpapers whose code starts with <see cref="CodePrefix"/>,
/// e.g. "10" -> 26 AZN for codes 1001-1047, "50" -> 23 AZN for codes 5001-5058.
/// </summary>
public sealed class CustomerPriceRule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CustomerId { get; set; }
    public string CodePrefix { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
