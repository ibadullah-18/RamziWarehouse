using GrandWall.Domain.Enums;

namespace GrandWall.Application.Abstractions.Identity;

public interface ICurrentUserService
{
    bool IsAuthenticated { get; }

    Guid UserId { get; }

    string FullName { get; }

    string Username { get; }

    UserRole Role { get; }
}