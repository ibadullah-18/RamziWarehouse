using GrandWall.Domain.Enums;

namespace GrandWall.Application.Abstractions.Identity;

public interface ICurrentUserService
{
    bool IsAuthenticated { get; }

    Guid UserId { get; }

    string FullName { get; }

    string Username { get; }

    UserRole Role { get; }

    /// <summary>Effective permissions of the signed-in user (role defaults unless overridden).</summary>
    IReadOnlyCollection<string> Permissions => Permission.Defaults(Role);

    bool Has(string permission) => Role == UserRole.Admin || Permissions.Contains(permission);
}