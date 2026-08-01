using RamziWarehouse.Domain.Common;
using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Domain.Entities;

public sealed class User : BaseEntity
{
    public string FullName { get; set; } = string.Empty;

    public string Username { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public UserRole Role { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime? LastLoginAtUtc { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; }
        = new List<RefreshToken>();
}