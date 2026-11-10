using Microsoft.AspNetCore.Authorization;

namespace GrandWall.Api.Authorization;

/// <summary>Allows the action only to users who have the permission (the Admin role always has it).</summary>
public sealed class RequirePermissionAttribute : AuthorizeAttribute
{
    public const string PolicyPrefix = "perm:";

    public RequirePermissionAttribute(string permission) => Policy = PolicyPrefix + permission;
}
