using GrandWall.Domain.Enums;

namespace GrandWall.Domain.Entities;

public sealed record LedgerItem(CustomerAccountEntryType Type, decimal Amount, DateOnly Date);
public sealed record LedgerBalance(decimal Old, decimal Carried, decimal Today, DateOnly? ActiveSince, decimal Advance = 0)
{
    public decimal Total => Old + Carried + Today;
}

public static class AccountLedger
{
    public static readonly DateOnly DailyRolloverSince = new(2026, 10, 8);
    public static LedgerBalance Calculate(IEnumerable<LedgerItem> entries, DateOnly date)
    {
        decimal old = 0, daily = 0, today = 0, advance = 0;
        DateOnly? activeSince = null;
        foreach (var group in entries.Where(e => e.Date <= date).GroupBy(e => e.Date).OrderBy(g => g.Key))
        {
            if (daily > 0 && (group.Key >= DailyRolloverSince || activeSince.HasValue && group.Key.DayNumber - activeSince.Value.DayNumber >= 5))
            { old += daily; daily = 0; activeSince = null; }
            var newDebt = group.Where(e => e.Type == CustomerAccountEntryType.Debt).Sum(e => e.Amount);
            var corrected = newDebt + group.Where(e => e.Type == CustomerAccountEntryType.DailyIncrease).Sum(e => e.Amount)
                - group.Where(e => e.Type == CustomerAccountEntryType.DailyDecrease).Sum(e => e.Amount);
            if (newDebt > 0) activeSince = group.Key;
            old += group.Where(e => e.Type is CustomerAccountEntryType.OpeningBalance or CustomerAccountEntryType.AdjustmentIncrease).Sum(e => e.Amount);
            old -= group.Where(e => e.Type == CustomerAccountEntryType.AdjustmentDecrease).Sum(e => e.Amount);
            var payment = advance + group.Where(e => e.Type is CustomerAccountEntryType.Payment or CustomerAccountEntryType.ReturnCredit or CustomerAccountEntryType.Bonus).Sum(e => e.Amount)
                - group.Where(e => e.Type == CustomerAccountEntryType.CreditReversal).Sum(e => e.Amount);
            advance = 0;
            if(payment<0){old-=payment;payment=0;}
            var paidToday = Math.Min(payment, corrected);
            corrected -= paidToday; payment -= paidToday;
            var paidCarry = Math.Min(payment, daily);
            daily -= paidCarry; payment -= paidCarry;
            old -= payment;
            if (group.Key >= DailyRolloverSince && old < 0) { advance = -old; old = 0; }
            if (group.Key == date) today = corrected;
            else daily += corrected;
        }
        if (daily > 0 && (date >= DailyRolloverSince || activeSince.HasValue && date.DayNumber - activeSince.Value.DayNumber >= 5))
        { old += daily; daily = 0; activeSince = null; }
        return new(old, daily, today, activeSince, advance);
    }
}
