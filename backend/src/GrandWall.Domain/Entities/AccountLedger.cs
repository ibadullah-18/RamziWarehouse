using GrandWall.Domain.Enums;

namespace GrandWall.Domain.Entities;

public sealed record LedgerItem(
    CustomerAccountEntryType Type,
    decimal Amount,
    DateOnly Date,
    DateTime CreatedAtUtc = default);

/// <summary>
/// Old = köhnə borc. Carried = "günlük köhnə": yesterday's daily debt that was kept for
/// tomorrow. Today = the daily debt of the day itself. Advance = money beyond all debt.
/// </summary>
public sealed record LedgerBalance(decimal Old, decimal Carried, decimal Today, decimal Advance)
{
    public decimal Total => Old + Carried + Today;
}

public static class AccountLedger
{
    /// <summary>
    /// First day that uses the "keep for tomorrow" rules. Earlier days moved every unpaid
    /// daily debt into the old debt when the day ended.
    /// </summary>
    public static readonly DateOnly CarryRulesSince = new(2026, 10, 25);

    /// <summary>State after every entry up to and including <paramref name="date"/>.</summary>
    public static LedgerBalance Closing(IEnumerable<LedgerItem> entries, DateOnly date)
        => Replay(entries.Where(e => e.Date <= date), date);

    /// <summary>State at the start of <paramref name="date"/>, before any of its entries.</summary>
    public static LedgerBalance Opening(IEnumerable<LedgerItem> entries, DateOnly date)
        => Replay(entries.Where(e => e.Date < date), date);

    private static LedgerBalance Replay(IEnumerable<LedgerItem> entries, DateOnly asOf)
    {
        decimal old = 0, carried = 0, today = 0, advance = 0;
        DateOnly? last = null;

        // A day passes. Unpaid carried debt always joins the old debt. The unpaid debt of
        // the day itself becomes tomorrow's carried debt, but only for one night: if nobody
        // looks at the customer for two days it joins the old debt as well. Days before the
        // new rules moved everything into the old debt at once.
        void Roll(DateOnly from, DateOnly to)
        {
            var days = to.DayNumber - from.DayNumber;
            if (days <= 0) return;
            if (from >= AccountLedger.CarryRulesSince && days == 1)
            {
                old += carried;
                carried = today;
                today = 0;
                return;
            }
            old += carried + today;
            carried = 0;
            today = 0;
        }

        void Absorb()
        {
            if (advance <= 0) return;
            foreach (var bucket in new[] { 0, 1, 2 })
            {
                var value = bucket == 0 ? today : bucket == 1 ? carried : old;
                var used = Math.Min(advance, Math.Max(value, 0));
                if (bucket == 0) today -= used; else if (bucket == 1) carried -= used; else old -= used;
                advance -= used;
            }
        }

        // Money, returns and bonus pay today's debt first, then the carried one, then the old one.
        void Credit(decimal amount)
        {
            var toToday = Math.Min(amount, Math.Max(today, 0));
            today -= toToday;
            amount -= toToday;
            var toCarried = Math.Min(amount, Math.Max(carried, 0));
            carried -= toCarried;
            amount -= toCarried;
            var toOld = Math.Min(amount, Math.Max(old, 0));
            old -= toOld;
            amount -= toOld;
            advance += amount;
        }

        foreach (var entry in entries.OrderBy(e => e.Date).ThenBy(e => e.CreatedAtUtc))
        {
            if (last.HasValue) Roll(last.Value, entry.Date);
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
                    today += amount;
                    Absorb();
                    break;
                case CustomerAccountEntryType.DailyDecrease:
                    // A reduction takes today's debt first, then the carried one, and what was
                    // already moved to the old debt at the end of the day comes from there.
                    var fromToday = Math.Min(amount, Math.Max(today, 0));
                    today -= fromToday;
                    amount -= fromToday;
                    var fromCarried = Math.Min(amount, Math.Max(carried, 0));
                    carried -= fromCarried;
                    old -= amount - fromCarried;
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
                    // Finishing the customer without keeping anything: every unpaid daily
                    // amount joins the old debt now. It sweeps whatever is left at that moment,
                    // so a later payment correction on the same day keeps the day consistent.
                    old += carried + today;
                    carried = 0;
                    today = 0;
                    break;
            }
        }

        if (last.HasValue) Roll(last.Value, asOf);
        return new LedgerBalance(old, carried, today, advance);
    }
}
