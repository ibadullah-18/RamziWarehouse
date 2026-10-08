using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
namespace GrandWall.Domain.UnitTests.Entities;
public sealed class AccountLedgerRolloverTests
{
    private static readonly DateOnly Day=new(2026,10,8);
    private static LedgerItem E(CustomerAccountEntryType type,decimal amount,int offset=0)=>new(type,amount,Day.AddDays(offset));
    [Theory][InlineData(50,450)][InlineData(80,420)]
    public void UnpaidMovesToOldExactlyOnce(decimal paid,decimal remaining)
    {var entries=new[]{E(CustomerAccountEntryType.OpeningBalance,400),E(CustomerAccountEntryType.Debt,100),E(CustomerAccountEntryType.Payment,paid)};foreach(var offset in new[]{1,2,5,30}){var b=AccountLedger.Calculate(entries,Day.AddDays(offset));Assert.Equal(remaining,b.Old);Assert.Equal(0,b.Carried);Assert.Equal(0,b.Today);}}
    [Theory][InlineData(CustomerAccountEntryType.ReturnCredit)][InlineData(CustomerAccountEntryType.Bonus)]
    public void CreditsReduceDebtButAreNotCash(CustomerAccountEntryType type)
    {var b=AccountLedger.Calculate([E(CustomerAccountEntryType.OpeningBalance,400),E(CustomerAccountEntryType.Debt,100),E(CustomerAccountEntryType.Payment,80),E(type,20)],Day);Assert.Equal(400,b.Total);Assert.Equal(0,b.Today);}
    [Fact]public void NextPaymentReducesOldAndDoesNotChangeYesterday()
    {var entries=new[]{E(CustomerAccountEntryType.OpeningBalance,400),E(CustomerAccountEntryType.Debt,100),E(CustomerAccountEntryType.Payment,80),E(CustomerAccountEntryType.Payment,30,1)};Assert.Equal(420,AccountLedger.Calculate(entries,Day).Total);Assert.Equal(390,AccountLedger.Calculate(entries,Day.AddDays(1)).Total);}
    [Fact]public void AdvanceIsPreservedAndOffsetsFutureSales()
    {var entries=new[]{E(CustomerAccountEntryType.Debt,100),E(CustomerAccountEntryType.Payment,150),E(CustomerAccountEntryType.Debt,80,1)};var initial=AccountLedger.Calculate(entries,Day);Assert.Equal(0,initial.Total);Assert.Equal(50,initial.Advance);var next=AccountLedger.Calculate(entries,Day.AddDays(1));Assert.Equal(30,next.Today);Assert.Equal(0,next.Advance);}
    [Fact]public void DelayedApprovalAndReversalPreserveOriginalReport()
    {var entries=new[]{E(CustomerAccountEntryType.Debt,100),E(CustomerAccountEntryType.Payment,80),E(CustomerAccountEntryType.ReturnCredit,20,2),E(CustomerAccountEntryType.CreditReversal,20,3)};Assert.Equal(20,AccountLedger.Calculate(entries,Day).Total);Assert.Equal(0,AccountLedger.Calculate(entries,Day.AddDays(2)).Total);Assert.Equal(20,AccountLedger.Calculate(entries,Day.AddDays(3)).Total);}
    [Fact]public void CashAndCardSumPrecisely()
    {var b=AccountLedger.Calculate([E(CustomerAccountEntryType.Debt,100),E(CustomerAccountEntryType.Payment,60),E(CustomerAccountEntryType.Payment,20),E(CustomerAccountEntryType.Bonus,20)],Day);Assert.Equal(0,b.Total);}
    [Fact]public void SameDayReversalRestoresDailyDebtRatherThanInventingOldDebt()
    {var b=AccountLedger.Calculate([E(CustomerAccountEntryType.Debt,100),E(CustomerAccountEntryType.Payment,80),E(CustomerAccountEntryType.ReturnCredit,20),E(CustomerAccountEntryType.CreditReversal,20)],Day);Assert.Equal(20,b.Today);Assert.Equal(0,b.Old);}
}
