namespace GrandWall.Domain.Entities;

/// <summary>App name and logo shown everywhere in the app; one row (Id 1), changed by the admin.</summary>
public sealed class AppBranding
{
    public const string DefaultName = "Ramzi";

    public int Id { get; set; } = 1;

    public string AppName { get; set; } = DefaultName;

    public byte[]? Logo { get; set; }

    public string? LogoContentType { get; set; }

    /// <summary>Square home-screen icons made from the logo (PNG): 512, 192 and 180 (iPhone) px.</summary>
    public byte[]? Icon512 { get; set; }

    public byte[]? Icon192 { get; set; }

    public byte[]? Icon180 { get; set; }

    public DateTime UpdatedAtUtc { get; set; }
}
