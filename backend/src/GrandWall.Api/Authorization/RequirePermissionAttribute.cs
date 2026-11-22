using Microsoft.AspNetCore.Authorization;

namespace GrandWall.Api.Authorization;

/// <summary>
/// Allows the action only to users who have the permission (the Admin role always has the
/// non-notification ones). With several permissions, any one of them is enough.
/// </summary>
public sealed class RequirePermissionAttribute : AuthorizeAttribute
{
    public const string PolicyPrefix = "perm:";

    public RequirePermissionAttribute(params string[] permissions) => Policy = PolicyPrefix + string.Join('|', permissions);
}
