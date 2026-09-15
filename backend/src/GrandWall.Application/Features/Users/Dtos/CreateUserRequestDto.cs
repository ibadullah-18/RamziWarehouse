using GrandWall.Domain.Enums;

namespace GrandWall.Application.Features.Users.Dtos;

public sealed class CreateUserRequestDto
{
    public string FullName { get; init; } = string.Empty;

    public string Username { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;

    public UserRole Role { get; init; }
}