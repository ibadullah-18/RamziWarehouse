using GrandWall.Domain.Entities;

namespace GrandWall.Domain.Enums;

/// <summary>
/// What a user may do. The admin ticks these per user; the role only gives the starting set.
/// The Admin role always has everything (it cannot be locked out).
/// </summary>
public static class Permission
{
    public const string AdminPanel = "admin.panel";
    public const string UsersManage = "users.manage";
    public const string SettingsManage = "settings.manage";

    public const string CustomersCreate = "customers.create";
    public const string CustomersEdit = "customers.edit";
    public const string CustomersDelete = "customers.delete";

    public const string ReturnsCreate = "returns.create";
    public const string ReturnsReview = "returns.review";
    public const string ReturnsNotify = "returns.notify";
    public const string ReturnsAdmin = "returns.admin";

    public const string AccountsUse = "accounts.use";
    public const string AccountsOldDebt = "accounts.oldDebt";
    public const string AccountsPriceRules = "accounts.priceRules";
    public const string AccountsResetToday = "accounts.resetToday";
    public const string AccountsWipe = "accounts.wipe";
    public const string AccountsPastDays = "accounts.pastDays";

    public static readonly IReadOnlyList<string> All =
    [
        AdminPanel, UsersManage, SettingsManage,
        CustomersCreate, CustomersEdit, CustomersDelete,
        ReturnsCreate, ReturnsReview, ReturnsNotify, ReturnsAdmin,
        AccountsUse, AccountsOldDebt, AccountsPriceRules, AccountsResetToday, AccountsWipe, AccountsPastDays,
    ];

    /// <summary>The starting set of each role: exactly what the role could do before permissions existed.</summary>
    public static IReadOnlyList<string> Defaults(UserRole role) => role switch
    {
        // Admin can do everything; return notifications stay opt-in (ticked per admin).
        UserRole.Admin => All.Where(code => code != ReturnsNotify).ToList(),
        UserRole.Manager => [CustomersCreate, CustomersEdit, ReturnsCreate, ReturnsReview, ReturnsNotify],
        UserRole.Accountant => [CustomersCreate, ReturnsCreate, AccountsUse, AccountsOldDebt, AccountsPriceRules, AccountsResetToday],
        UserRole.Driver => [CustomersCreate, ReturnsCreate, AccountsUse],
        UserRole.WarehouseWorker => [CustomersCreate, ReturnsCreate],
        _ => [],
    };

    /// <summary>Stored list ("a,b,c"); null means the role's defaults.</summary>
    public static IReadOnlyList<string> Effective(UserRole role, string? stored)
    {
        if (stored is null) return Defaults(role);
        if (role == UserRole.Admin)
            return stored.Split(',').Contains(ReturnsNotify) ? All : Defaults(role);
        var chosen = stored.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToHashSet();
        return All.Where(chosen.Contains).ToList();
    }

    public static IReadOnlyList<string> Effective(User user) => Effective(user.Role, user.Permissions);

    /// <summary>What to store for a chosen list: null when it equals the role's defaults.</summary>
    public static string? ToStored(UserRole role, IEnumerable<string>? chosen)
    {
        if (chosen is null) return null;
        var set = chosen.ToHashSet();
        if (role == UserRole.Admin) return set.Contains(ReturnsNotify) ? ReturnsNotify : null;
        var unknown = set.FirstOrDefault(code => !All.Contains(code));
        if (unknown is not null) throw new ArgumentException($"Naməlum icazə: {unknown}");
        var ordered = All.Where(set.Contains).ToList();
        return ordered.SequenceEqual(Defaults(role)) ? null : string.Join(',', ordered);
    }
}
