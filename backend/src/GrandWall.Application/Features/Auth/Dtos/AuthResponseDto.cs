using GrandWall.Domain.Enums;

namespace GrandWall.Application.Features.Auth.Dtos;

public sealed class AuthResponseDto
{
    public string AccessToken { get; init; } = string.Empty;

    public string RefreshToken { get; init; } = string.Empty;

    public DateTime AccessTokenExpiresAtUtc { get; init; }

    public Guid UserId { get; init; }

    public string FullName { get; init; } = string.Empty;

    public string Username { get; init; } = string.Empty;

    public UserRole Role { get; init; }
}