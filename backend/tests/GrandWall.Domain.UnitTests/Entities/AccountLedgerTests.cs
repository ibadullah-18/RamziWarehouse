using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
namespace GrandWall.Domain.UnitTests.Entities;
public sealed class AccountLedgerTests
{
    private static readonly DateOnly Start = new(2026,9,1);
    private static LedgerItem Old(decimal n)=>new(CustomerAccountEntryType.OpeningBalance,n,Start);
    private static LedgerItem Debt(decimal n,int day=0)=>new(CustomerAccountEntryType.Debt,n,Start.AddDays(day));
    private static LedgerItem Pay(decimal n,int day=0)=>new(CustomerAccountEntryType.Payment,n,Start.AddDays(day));
    [Fact] public void ExcessPaymentClosesTodayBeforeOld()
    {var b=AccountLedger.Calculate([Old(300),Debt(100),Pay(150)],Start);Assert.Equal(new LedgerBalance(250,0,0,Start),b);}
    [Fact] public void NewDailyDebtRestartsClockAndPaymentClosesTodayFirst()
    {var entries=new[]{Old(300),Debt(100),Pay(50),Debt(100,1),Pay(90,1)};
     var b=AccountLedger.Calculate(entries,Start.AddDays(2));Assert.Equal(300,b.Old);Assert.Equal(60,b.Carried);
     b=AccountLedger.Calculate(entries,Start.AddDays(5));Assert.Equal(60,b.Carried);
     b=AccountLedger.Calculate(entries,Start.AddDays(6));Assert.Equal(360,b.Old);Assert.Equal(0,b.Carried);}
    [Theory] [InlineData(160,300)] [InlineData(190,270)]
    public void PaymentClosesTodayThenCarriedThenOld(decimal paid,decimal old)
    {var b=AccountLedger.Calculate([Old(300),Debt(100),Pay(50),Debt(100,1),Pay(90,1),Debt(100,2),Pay(paid,2)],Start.AddDays(2));Assert.Equal(old,b.Old);Assert.Equal(0,b.Carried);Assert.Equal(0,b.Today);}
    [Fact] public void UnpaidDailyMovesOnSixthCalendarDay()
    {var entries=new[]{Old(300),Debt(100),Pay(50)};Assert.Equal(50,AccountLedger.Calculate(entries,Start.AddDays(4)).Carried);var b=AccountLedger.Calculate(entries,Start.AddDays(5));Assert.Equal(350,b.Old);Assert.Equal(0,b.Carried);}
    [Fact] public void CorrectionPreservesNetDebtAndHistoricalDay()
    {var entries=new[]{Old(300),Debt(100),new LedgerItem(CustomerAccountEntryType.DailyDecrease,20,Start),Pay(30)};var b=AccountLedger.Calculate(entries,Start);Assert.Equal(50,b.Today);Assert.Equal(350,b.Total);}
}
