namespace GrandWall.Application.Abstractions.Authentication;

public sealed class TokenResult
{
    public string AccessToken { get; init; } = string.Empty;

    public string RefreshToken { get; init; } = string.Empty;

    public string RefreshTokenHash { get; init; } = string.Empty;

    public DateTime AccessTokenExpiresAtUtc { get; init; }

    public DateTime RefreshTokenExpiresAtUtc { get; init; }
}