using GrandWall.Domain.Enums;

namespace GrandWall.Domain.Entities;

public sealed record LedgerItem(CustomerAccountEntryType Type, decimal Amount, DateOnly Date);
public sealed record LedgerBalance(decimal Old, decimal Carried, decimal Today, DateOnly? ActiveSince)
{
    public decimal Total => Old + Carried + Today;
}

public static class AccountLedger
{
    public static LedgerBalance Calculate(IEnumerable<LedgerItem> entries, DateOnly date)
    {
        decimal old = 0, daily = 0, today = 0;
        DateOnly? activeSince = null;
        foreach (var group in entries.Where(e => e.Date <= date).GroupBy(e => e.Date).OrderBy(g => g.Key))
        {
            if (activeSince.HasValue && group.Key.DayNumber - activeSince.Value.DayNumber >= 5)
            { old += daily; daily = 0; activeSince = null; }
            var newDebt = group.Where(e => e.Type == CustomerAccountEntryType.Debt).Sum(e => e.Amount);
            var corrected = newDebt + group.Where(e => e.Type == CustomerAccountEntryType.DailyIncrease).Sum(e => e.Amount)
                - group.Where(e => e.Type == CustomerAccountEntryType.DailyDecrease).Sum(e => e.Amount);
            if (newDebt > 0) activeSince = group.Key;
            old += group.Where(e => e.Type is CustomerAccountEntryType.OpeningBalance or CustomerAccountEntryType.AdjustmentIncrease).Sum(e => e.Amount);
            old -= group.Where(e => e.Type == CustomerAccountEntryType.AdjustmentDecrease).Sum(e => e.Amount);
            var payment = group.Where(e => e.Type == CustomerAccountEntryType.Payment).Sum(e => e.Amount);
            var paidToday = Math.Min(payment, corrected);
            corrected -= paidToday; payment -= paidToday;
            var paidCarry = Math.Min(payment, daily);
            daily -= paidCarry; payment -= paidCarry;
            old -= payment;
            if (group.Key == date) today = corrected;
            else daily += corrected;
        }
        if (activeSince.HasValue && date.DayNumber - activeSince.Value.DayNumber >= 5)
        { old += daily; daily = 0; activeSince = null; }
        return new(old, daily, today, activeSince);
    }
}
