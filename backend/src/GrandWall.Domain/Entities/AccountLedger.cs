using GrandWall.Domain.Enums;

namespace GrandWall.Domain.Entities;

public sealed record LedgerItem(
    CustomerAccountEntryType Type,
    decimal Amount,
    DateOnly Date,
    DateTime CreatedAtUtc = default);

/// <summary>
/// Old = köhnə borc, Daily = günlük borc (yesterday's kept balance and today's new debt
/// form one bucket), Advance = money received beyond all debt.
/// </summary>
public sealed record LedgerBalance(decimal Old, decimal Daily, decimal Advance)
{
    public decimal Total => Old + Daily;
}

public static class AccountLedger
{
    /// <summary>
    /// First day that uses the explicit "keep for tomorrow" rule. Earlier days
    /// moved every unpaid daily debt into the old debt when the day ended.
    /// </summary>
    public static readonly DateOnly CarryRulesSince = new(2026, 10, 26);

    /// <summary>State after every entry up to and including <paramref name="date"/>.</summary>
    public static LedgerBalance Closing(IEnumerable<LedgerItem> entries, DateOnly date)
        => Replay(entries.Where(e => e.Date <= date), date);

    /// <summary>State at the start of <paramref name="date"/>, before any of its entries.</summary>
    public static LedgerBalance Opening(IEnumerable<LedgerItem> entries, DateOnly date)
        => Replay(entries.Where(e => e.Date < date), date);

    private static LedgerBalance Replay(IEnumerable<LedgerItem> entries, DateOnly asOf)
    {
        decimal old = 0, daily = 0, advance = 0;
        DateOnly? last = null;

        void RollLegacyDay(DateOnly day, DateOnly before)
        {
            if (day < CarryRulesSince && day < before && daily > 0)
            {
                old += daily;
                daily = 0;
            }
        }

        void Absorb()
        {
            if (advance <= 0) return;
            var toDaily = Math.Min(advance, Math.Max(daily, 0));
            daily -= toDaily;
            advance -= toDaily;
            var toOld = Math.Min(advance, Math.Max(old, 0));
            old -= toOld;
            advance -= toOld;
        }

        void Credit(decimal amount)
        {
            var toDaily = Math.Min(amount, Math.Max(daily, 0));
            daily -= toDaily;
            amount -= toDaily;
            var toOld = Math.Min(amount, Math.Max(old, 0));
            old -= toOld;
            amount -= toOld;
            advance += amount;
        }

        foreach (var entry in entries.OrderBy(e => e.Date).ThenBy(e => e.CreatedAtUtc))
        {
            if (last.HasValue) RollLegacyDay(last.Value, entry.Date);
            last = entry.Date;
            var amount = entry.Amount;
            switch (entry.Type)
            {
                case CustomerAccountEntryType.OpeningBalance:
                case CustomerAccountEntryType.AdjustmentIncrease:
                    old += amount;
                    Absorb();
                    break;
                case CustomerAccountEntryType.AdjustmentDecrease:
                    old -= amount;
                    break;
                case CustomerAccountEntryType.Debt:
                case CustomerAccountEntryType.DailyIncrease:
                    daily += amount;
                    Absorb();
                    break;
                case CustomerAccountEntryType.DailyDecrease:
                    // A reduction first takes the daily bucket; whatever was already
                    // moved to the old debt at the end of the day is taken from there.
                    var fromDaily = Math.Min(amount, Math.Max(daily, 0));
                    daily -= fromDaily;
                    old -= amount - fromDaily;
                    break;
                case CustomerAccountEntryType.Payment:
                case CustomerAccountEntryType.ReturnCredit:
                case CustomerAccountEntryType.Bonus:
                    Credit(amount);
                    break;
                case CustomerAccountEntryType.CreditReversal:
                    var fromAdvance = Math.Min(amount, advance);
                    advance -= fromAdvance;
                    old += amount - fromAdvance;
                    break;
                case CustomerAccountEntryType.DailyToOld:
                    // Sweeps whatever daily debt is left at that moment, so a later
                    // payment correction on the same day keeps the day consistent.
                    if (daily > 0)
                    {
                        old += daily;
                        daily = 0;
                    }
                    break;
            }
        }

        if (last.HasValue) RollLegacyDay(last.Value, asOf);
        return new LedgerBalance(old, daily, advance);
    }
}
