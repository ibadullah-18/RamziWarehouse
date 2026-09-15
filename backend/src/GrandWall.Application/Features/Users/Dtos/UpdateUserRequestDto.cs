using GrandWall.Domain.Enums;

namespace GrandWall.Application.Features.Users.Dtos;

public sealed class UpdateUserRequestDto
{
    public string FullName { get; init; } = string.Empty;

    public string Username { get; init; } = string.Empty;

    public UserRole Role { get; init; }

    public bool? IsActive { get; init; }
}