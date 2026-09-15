namespace GrandWall.Api.Authorization;

public static class AuthorizationPolicies
{
    public const string AdminOnly =
        nameof(AdminOnly);

    public const string ManagerOrAdmin =
        nameof(ManagerOrAdmin);
}