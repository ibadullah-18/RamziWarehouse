using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;

namespace GrandWall.Domain.UnitTests.Entities;

public sealed class AccountLedgerTests
{
    // Every date below is on or after CarryRulesSince, so the explicit "keep for tomorrow" rules apply.
    private static readonly DateOnly Day1 = AccountLedger.CarryRulesSince;
    private static readonly DateOnly Day2 = Day1.AddDays(1);
    private static readonly DateOnly Day3 = Day1.AddDays(2);

    private static int tick;

    private static LedgerItem Item(CustomerAccountEntryType type, decimal amount, DateOnly date)
        => new(type, amount, date, new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc).AddSeconds(tick++));

    private static LedgerItem Old(decimal amount, DateOnly? date = null) => Item(CustomerAccountEntryType.OpeningBalance, amount, date ?? Day1);
    private static LedgerItem Daily(decimal amount, DateOnly date) => Item(CustomerAccountEntryType.Debt, amount, date);
    private static LedgerItem Pay(decimal amount, DateOnly date) => Item(CustomerAccountEntryType.Payment, amount, date);
    private static LedgerItem Sweep(DateOnly date) => Item(CustomerAccountEntryType.DailyToOld, 1, date);

    [Fact]
    public void PaymentClosesDailyFirstThenOld()
    {
        var entries = new[] { Old(300), Daily(100, Day1), Pay(150, Day1) };

        var closing = AccountLedger.Closing(entries, Day1);

        Assert.Equal(new LedgerBalance(250, 0, 0), closing);
    }

    [Fact]
    public void MoneyBeyondAllDebtIsKeptAsAdvanceAndCoversTheNextDebt()
    {
        var entries = new[] { Old(100), Daily(100, Day1), Pay(250, Day1) };

        Assert.Equal(new LedgerBalance(0, 0, 50), AccountLedger.Closing(entries, Day1));

        var next = entries.Append(Daily(80, Day2)).ToArray();
        Assert.Equal(new LedgerBalance(0, 30, 0), AccountLedger.Closing(next, Day2));
    }

    [Fact]
    public void UnpaidDailyDebtStaysDailyUntilTheCustomerIsFinishedWithoutKeeping()
    {
        var entries = new[] { Old(300), Daily(100, Day1), Pay(40, Day1) };

        // Day 2 and day 3: nobody swept it, so it is still tomorrow's daily debt.
        Assert.Equal(new LedgerBalance(300, 60, 0), AccountLedger.Opening(entries, Day2));
        Assert.Equal(new LedgerBalance(300, 60, 0), AccountLedger.Opening(entries, Day3));
    }

    [Fact]
    public void NewDailyDebtJoinsTheKeptBalanceInOneBucket()
    {
        var entries = new[] { Daily(100, Day1), Pay(40, Day1), Daily(70, Day2) };

        var closing = AccountLedger.Closing(entries, Day2);

        Assert.Equal(0, closing.Old);
        Assert.Equal(130, closing.Daily);
    }

    [Fact]
    public void FinishingWithoutKeepingMovesTheUnpaidRestIntoOldDebt()
    {
        var entries = new[] { Old(300), Daily(250, Day1), Pay(100, Day1), Sweep(Day1) };

        var closing = AccountLedger.Closing(entries, Day1);

        Assert.Equal(new LedgerBalance(450, 0, 0), closing);
        Assert.Equal(450, AccountLedger.Opening(entries, Day2).Old);
    }

    [Fact]
    public void LateOrderAfterFinishingStartsANewDailyDebt()
    {
        var entries = new[] { Daily(250, Day1), Pay(250, Day1), Sweep(Day1), Daily(90, Day1) };

        Assert.Equal(new LedgerBalance(0, 90, 0), AccountLedger.Closing(entries, Day1));
    }

    [Fact]
    public void ReducingTheDailyDebtAfterItWasSweptReducesTheOldDebt()
    {
        var entries = new[]
        {
            Daily(250, Day1), Pay(100, Day1), Sweep(Day1),
            Item(CustomerAccountEntryType.DailyDecrease, 50, Day1)
        };

        Assert.Equal(new LedgerBalance(100, 0, 0), AccountLedger.Closing(entries, Day1));
    }

    [Fact]
    public void ReturnsAndBonusReduceDebtLikeMoney()
    {
        var entries = new[]
        {
            Daily(200, Day1),
            Item(CustomerAccountEntryType.ReturnCredit, 60, Day1),
            Item(CustomerAccountEntryType.Bonus, 20, Day1),
            Pay(100, Day1)
        };

        Assert.Equal(new LedgerBalance(0, 20, 0), AccountLedger.Closing(entries, Day1));
    }

    [Fact]
    public void ReversingACreditRestoresTheDebtAsOldDebt()
    {
        var entries = new[]
        {
            Daily(100, Day1),
            Item(CustomerAccountEntryType.ReturnCredit, 100, Day1),
            Item(CustomerAccountEntryType.CreditReversal, 40, Day2)
        };

        Assert.Equal(new LedgerBalance(40, 0, 0), AccountLedger.Closing(entries, Day2));
    }

    [Fact]
    public void DaysBeforeTheCarryRulesStillRollUnpaidDailyIntoOldDebt()
    {
        var legacy = AccountLedger.CarryRulesSince.AddDays(-3);
        var entries = new[]
        {
            Item(CustomerAccountEntryType.Debt, 100, legacy),
            Item(CustomerAccountEntryType.Payment, 30, legacy)
        };

        Assert.Equal(new LedgerBalance(0, 70, 0), AccountLedger.Closing(entries, legacy));
        Assert.Equal(new LedgerBalance(70, 0, 0), AccountLedger.Closing(entries, legacy.AddDays(1)));
    }

    [Fact]
    public void OpeningIgnoresTheDayItself()
    {
        var entries = new[] { Old(300), Daily(100, Day1) };

        Assert.Equal(new LedgerBalance(0, 0, 0), AccountLedger.Opening(entries, Day1));
        Assert.Equal(new LedgerBalance(300, 100, 0), AccountLedger.Closing(entries, Day1));
    }
}
