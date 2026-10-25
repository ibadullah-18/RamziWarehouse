namespace GrandWall.Application.Features.ProductReturns.Validators;

/// <summary>Product codes and batches contain only digits and hyphens, e.g. 1019 or 340-1.</summary>
public static class ProductCodeRules
{
    public const string Pattern = @"^[0-9][0-9\-]*$";

    public const string Message =
        "Kod və partiya yalnız rəqəm və - işarəsindən ibarət olmalıdır (məsələn 340-1).";

    public static bool IsValid(string? value)
        => !string.IsNullOrEmpty(value) && System.Text.RegularExpressions.Regex.IsMatch(value, Pattern);
}
