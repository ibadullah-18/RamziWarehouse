namespace GrandWall.Domain.Entities;

/// <summary>
/// Admin setting for every return (not only Sədərək): how many digits a wallpaper code must have
/// and whether its second digit must be 0 (1019, 5012, 6001 ...). A return that breaks the rule
/// can not be saved or sent to the manager. There is a single row.
/// </summary>
public sealed class ReturnCodeRule
{
    public const int SingletonId = 1;

    public int Id { get; set; } = SingletonId;

    /// <summary>Required number of digits; null means any length.</summary>
    public int? RequiredLength { get; set; }

    public bool SecondDigitMustBeZero { get; set; }

    /// <summary>Why the code breaks the rule, or null when it is fine.</summary>
    public string? Violation(string productCode)
    {
        var code = productCode.Trim();
        if (RequiredLength is int length && code.Length != length)
            return $"{code}: məhsul kodu {length} rəqəmli olmalıdır.";
        if (SecondDigitMustBeZero && (code.Length < 2 || code[1] != '0'))
            return $"{code}: kodun ikinci rəqəmi 0 olmalıdır (məsələn 1019, 5012).";
        return null;
    }
}
