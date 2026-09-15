namespace GrandWall.Domain.Enums;

public static class UserRoleExtensions
{
    public static bool IsAdmin(
        this UserRole role)
    {
        return role == UserRole.Admin;
    }

    public static bool CanManageOperations(
        this UserRole role)
    {
        return role is
            UserRole.Admin or
            UserRole.Manager;
    }
}