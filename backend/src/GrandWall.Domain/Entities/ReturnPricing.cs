using GrandWall.Domain.Enums;

namespace GrandWall.Domain.Entities;

public sealed record PricedLine(string ProductCode, int Quantity, decimal? UnitPrice)
{
    public decimal Total => (UnitPrice ?? 0) * Quantity;
}

/// <summary>
/// Prices a return from the customer's code-prefix list. Only wallpaper returns are priced;
/// showcase (vitrin) items are never charged. The longest matching prefix wins, so a special
/// price for "501" can sit next to a general one for "50".
/// </summary>
public static class ReturnPricing
{
    public static IReadOnlyList<PricedLine> Lines(
        IEnumerable<(string ProductCode, int Quantity, ProductType Type)> items,
        IReadOnlyCollection<CustomerPriceRule> rules)
        => items
            .Where(item => item.Type == ProductType.Product)
            .Select(item => new PricedLine(item.ProductCode, item.Quantity, PriceFor(item.ProductCode, rules)))
            .ToList();

    public static decimal Total(
        IEnumerable<(string ProductCode, int Quantity, ProductType Type)> items,
        IReadOnlyCollection<CustomerPriceRule> rules)
        => Lines(items, rules).Sum(line => line.Total);

    public static decimal? PriceFor(string productCode, IReadOnlyCollection<CustomerPriceRule> rules)
    {
        var code = productCode.Trim();
        return rules
            .Where(rule => rule.CodePrefix.Length > 0 && code.StartsWith(rule.CodePrefix, StringComparison.Ordinal))
            .OrderByDescending(rule => rule.CodePrefix.Length)
            .Select(rule => (decimal?)rule.Price)
            .FirstOrDefault();
    }
}
