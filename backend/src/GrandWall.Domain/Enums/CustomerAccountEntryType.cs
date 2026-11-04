namespace GrandWall.Domain.Enums;

public enum CustomerAccountEntryType
{
    OpeningBalance = 1,
    Debt = 2,
    Payment = 3,
    AdjustmentIncrease = 4,
    AdjustmentDecrease = 5,
    DailyIncrease = 6,
    DailyDecrease = 7,
    ReturnCredit = 8,
    Bonus = 9,
    CreditReversal = 10,

    /// <summary>
    /// Unpaid daily debt that the operator did not keep for tomorrow;
    /// it is moved into the old debt when the customer's day is finished.
    /// </summary>
    DailyToOld = 11,

    /// <summary>
    /// Money given back to the customer when we owe them (their returns were worth more than
    /// their debt). It uses up the customer's credit and is subtracted from the collected cash/card.
    /// </summary>
    Payout = 12
}
