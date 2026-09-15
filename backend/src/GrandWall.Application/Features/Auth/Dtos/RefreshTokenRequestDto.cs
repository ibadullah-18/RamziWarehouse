namespace GrandWall.Application.Features.Auth.Dtos;

public sealed class RefreshTokenRequestDto
{
    public string RefreshToken { get; init; } = string.Empty;
}