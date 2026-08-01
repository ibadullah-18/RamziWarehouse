using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Application.Features.Users.Dtos;

public sealed class UserDto
{
    public Guid Id { get; init; }

    public string FullName { get; init; } = string.Empty;

    public string Username { get; init; } = string.Empty;

    public UserRole Role { get; init; }

    public bool IsActive { get; init; }

    public DateTime? LastLoginAtUtc { get; init; }

    public DateTime CreatedAtUtc { get; init; }
}