using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;

namespace GrandWall.Domain.UnitTests.Entities;

public sealed class ReturnPricingTests
{
    private static readonly CustomerPriceRule[] Rules =
    [
        new() { CodePrefix = "10", Price = 26 },
        new() { CodePrefix = "50", Price = 23 },
        new() { CodePrefix = "501", Price = 30 }
    ];

    [Fact]
    public void LongestMatchingPrefixWins()
    {
        Assert.Equal(23, ReturnPricing.PriceFor("5058", Rules));
        Assert.Equal(30, ReturnPricing.PriceFor("5012", Rules));
        Assert.Equal(26, ReturnPricing.PriceFor("1047", Rules));
        Assert.Null(ReturnPricing.PriceFor("7001", Rules));
    }

    [Fact]
    public void OnlyWallpaperLinesArePricedByQuantity()
    {
        var total = ReturnPricing.Total(
        [
            ("5058", 2, ProductType.Product),
            ("1001", 1, ProductType.Product),
            ("1002", 5, ProductType.Showcase),
            ("9999", 3, ProductType.Product)
        ], Rules);

        Assert.Equal(72, total);
    }
}
