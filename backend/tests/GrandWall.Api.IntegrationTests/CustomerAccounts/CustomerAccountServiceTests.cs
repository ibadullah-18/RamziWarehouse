using GrandWall.Application.Abstractions.Identity;
using GrandWall.Application.Common.Exceptions;
using GrandWall.Application.Features.CustomerAccounts.Dtos;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Persistence;
using GrandWall.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace GrandWall.Api.IntegrationTests.CustomerAccounts;

// These verify service persistence and permissions. SQL locking is not emulated by InMemory.
public sealed class CustomerAccountServiceTests
{
    private sealed class Actor : ICurrentUserService
    {
        public bool IsAuthenticated => true;
        public Guid UserId { get; set; } = Guid.NewGuid();
        public string FullName => "Açot test istifadəçisi";
        public string Username => "account.test";
        public UserRole Role { get; set; } = UserRole.Accountant;
    }
    private sealed class Clock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(2026, 9, 30, 10, 0, 0, TimeSpan.Zero);
    }
    private static (AppDbContext Db, Actor User, CustomerAccountService Service, Guid Customer) Setup()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options;
        var db = new AppDbContext(options);
        var c = new Customer { Name = "Müştəri" };
        db.Customers.Add(c); db.SaveChanges();
        var user = new Actor();
        return (db, user, new CustomerAccountService(db, user, new Clock()), c.Id);
    }
    [Fact]
    public async Task PaymentAndClosurePreserveAmountsMethodAndActor()
    {
        var (db, user, service, id) = Setup(); using var dispose = db;
        await service.CreateTodayAsync(new() { CustomerId = id, InitialPreviousDebt = 300, TodayDebt = 100 });
        user.Role = UserRole.Driver;
        var result = await service.RecordPaymentAsync(new() { CustomerId = id, Amount = 150, PaymentMethod = "card" });
        Assert.Equal(250, result.OldDebtRemaining); Assert.Equal(0, result.TodayDebtRemaining);
        var payment = Assert.Single(result.Days.Single().Entries, e => e.EntryType == CustomerAccountEntryType.Payment);
        Assert.Equal(user.UserId, payment.RecordedByUserId); Assert.Equal("card", payment.PaymentMethod);
        var closed = await service.CloseDayAsync(); Assert.NotNull(closed.Closure); Assert.Equal(150, closed.Card); Assert.Equal(0, closed.Cash);
        await service.RecordPaymentAsync(new() { CustomerId = id, Amount = 1, PaymentMethod = "cash" });
        Assert.Equal(151, (await service.CloseDayAsync()).Total);
    }
    [Fact]
    public async Task CorrectionsAppendAuditAndOverpaymentIsRejected()
    {
        var (db, user, service, id) = Setup(); using var dispose = db;
        await service.CreateTodayAsync(new() { CustomerId = id, InitialPreviousDebt = 300, TodayDebt = 100 });
        await service.CorrectDailyAsync(new() { CustomerId = id, Amount = 80, Reason = "Səhv məbləğ" });
        user.Role = UserRole.Admin;
        var result = await service.CorrectPreviousDebtAsync(new() { CustomerId = id, CorrectedPreviousDebt = 250, Reason = "İlkin düzəliş" });
        Assert.Equal(330, result.RemainingDebt);
        Assert.Contains(result.Days.Single().Entries, e => e.Note!.Contains("100.00 → 80.00") && e.RecordedByUserId == user.UserId);
        user.Role = UserRole.Driver;
        await Assert.ThrowsAsync<ConflictException>(() => service.RecordPaymentAsync(new() { CustomerId = id, Amount = 331, PaymentMethod = "cash" }));
        await service.RecordPaymentAsync(new() { CustomerId = id, Amount = 20, PaymentMethod = "cash" });
        user.Role = UserRole.Accountant;
        await Assert.ThrowsAsync<ConflictException>(() => service.CorrectDailyAsync(new() { CustomerId = id, Amount = 10, Reason = "Yanlış məbləğ" }));
        Assert.Equal(310, (await service.GetByCustomerIdAsync(id)).RemainingDebt);
    }
    [Fact]
    public async Task DriverAndAccountantShareLedgerPermissionsButCannotCorrectOldDebt()
    {
        var (db, user, service, id) = Setup(); using var dispose = db;
        user.Role = UserRole.Driver;
        await service.CreateTodayAsync(new() { CustomerId = id, TodayDebt = 100, InitialPreviousDebt = 300 });
        await service.CorrectDailyAsync(new() { CustomerId = id, Amount = 90, Reason = "Düzəliş" });
        user.UserId = Guid.NewGuid();
        user.Role = UserRole.Accountant;
        await Assert.ThrowsAsync<ForbiddenException>(() => service.CorrectPreviousDebtAsync(new() {CustomerId=id, CorrectedPreviousDebt=10,Reason="Düzəliş"}));
        await service.CorrectDailyAsync(new() {CustomerId=id,Amount=80,Reason="Günlük düzəliş"});
        user.Role=UserRole.Manager;
        await Assert.ThrowsAsync<ForbiddenException>(()=>service.GetByCustomerIdAsync(id));
        await Assert.ThrowsAsync<ForbiddenException>(()=>service.GetReportHistoryAsync());
        user.Role=UserRole.Accountant;
        await service.RecordPaymentAsync(new() { CustomerId = id, Amount = 1, PaymentMethod = "cash" });
    }

    [Fact]
    public async Task ClosureLocksExistingEntriesButLateWorkUsesSameDailyReport()
    {
        var (db,user,service,id)=Setup();using var dispose=db;
        user.Role=UserRole.Driver;
        await service.CreateTodayAsync(new(){CustomerId=id,TodayDebt=100,InitialPreviousDebt=300});
        await service.RecordPaymentAsync(new(){CustomerId=id,Amount=100,PaymentMethod="cash"});
        var payment=(await service.GetByCustomerIdAsync(id)).Days.Single().Entries.Single(e=>e.EntryType==CustomerAccountEntryType.Payment);
        await service.CloseDayAsync();
        await Assert.ThrowsAsync<ForbiddenException>(()=>service.CorrectDailyAsync(new(){CustomerId=id,Amount=110,Reason="Kilid testi"}));
        await Assert.ThrowsAsync<ForbiddenException>(()=>service.CorrectPaymentAsync(new(){CustomerId=id,EntryId=payment.Id,ExpectedAmount=100,ExpectedPaymentMethod="cash",Amount=90,PaymentMethod="card",Reason="Kilid testi"}));
        await service.CreateTodayAsync(new(){CustomerId=id,TodayDebt=60,InitialPreviousDebt=20});
        await service.CorrectDailyAsync(new(){CustomerId=id,Amount=50,Reason="Gec borc düzəlişi"});
        user.Role=UserRole.Accountant;
        await service.RecordPaymentAsync(new(){CustomerId=id,Amount=50,PaymentMethod="card"});
        var open=await service.GetReportAsync(new(2026,9,30));Assert.True(open.HasOpenEntries);Assert.Equal(100,open.Cash);Assert.Equal(50,open.Card);
        Assert.Equal(150,Assert.Single(open.Customers).TodayDebt);
        var closed=await service.CloseDayAsync();Assert.False(closed.HasOpenEntries);Assert.Equal(150,closed.Total);Assert.Equal(320,Assert.Single(closed.Customers).RemainingDebt);
        Assert.Single(await db.AccountDayClosures.ToListAsync());Assert.Single(await service.GetReportHistoryAsync());
        user.Role=UserRole.Admin;
        var corrected=await service.CorrectPaymentAsync(new(){CustomerId=id,EntryId=payment.Id,ExpectedAmount=100,ExpectedPaymentMethod="cash",Amount=90,PaymentMethod="card",Reason="Admin düzəlişi"});
        Assert.Single(corrected.Audit);Assert.Equal(330,corrected.RemainingDebt);
        var report=await service.GetReportAsync(new(2026,9,30));Assert.Equal(0,report.Cash);Assert.Equal(140,report.Card);
        await Assert.ThrowsAsync<ConflictException>(()=>service.CorrectPaymentAsync(new(){CustomerId=id,EntryId=payment.Id,ExpectedAmount=100,ExpectedPaymentMethod="cash",Amount=80,PaymentMethod="cash",Reason="Köhnə məlumat"}));
    }

    [Fact]
    public async Task DeletedCustomerKeepsDebtAndAuditButCannotReceiveNewDebt()
    {
        var (db, user, service, id) = Setup(); using var dispose = db;
        await service.CreateTodayAsync(new() {CustomerId=id,InitialPreviousDebt=300,TodayDebt=100});
        var customers=new CustomerService(db,user);
        await Assert.ThrowsAsync<ForbiddenException>(()=>customers.DeleteAsync(id));
        user.Role=UserRole.Admin;
        await customers.DeleteAsync(id);
        Assert.Empty(await customers.GetAllAsync(null,null));
        var summary=Assert.Single((await service.GetAllAsync(new())).Items);
        Assert.Equal(400,summary.RemainingDebt); Assert.False(summary.IsActive);
        Assert.Equal(2,(await service.GetByCustomerIdAsync(id)).Days.Single().Entries.Count);
        await Assert.ThrowsAsync<ConflictException>(()=>service.CreateTodayAsync(new(){CustomerId=id,TodayDebt=10}));
        await service.RecordPaymentAsync(new(){CustomerId=id,Amount=400,PaymentMethod="cash"});
        Assert.Empty((await service.GetAllAsync(new())).Items);
        Assert.Equal(400,(await service.GetReportAsync(new DateOnly(2026,9,30))).Cash);
        Assert.Equal(3,(await service.GetByCustomerIdAsync(id)).Days.Single().Entries.Count);
    }

    [Fact]
    public async Task OpenPaymentCanBeCorrectedButOverpaymentAndHistoricalNonAdminChangesAreRejected()
    {
        var (db,user,service,id)=Setup();using var dispose=db;
        await service.CreateTodayAsync(new(){CustomerId=id,TodayDebt=100});
        await service.RecordPaymentAsync(new(){CustomerId=id,Amount=20,PaymentMethod="cash"});
        var payment=(await service.GetByCustomerIdAsync(id)).Days.Single().Entries.Single(e=>e.EntryType==CustomerAccountEntryType.Payment);
        user.Role=UserRole.Driver;
        var corrected=await service.CorrectPaymentAsync(new(){CustomerId=id,EntryId=payment.Id,ExpectedAmount=20,ExpectedPaymentMethod="cash",Amount=15,PaymentMethod="card",Reason="Səhv daxil edilib"});
        Assert.Equal(85,corrected.RemainingDebt);Assert.Single(corrected.Audit);
        await Assert.ThrowsAsync<ConflictException>(()=>service.CorrectPaymentAsync(new(){CustomerId=id,EntryId=payment.Id,ExpectedAmount=15,ExpectedPaymentMethod="card",Amount=101,PaymentMethod="cash",Reason="Artıq ödəniş"}));
        Assert.Equal(15,(await service.GetReportAsync(new(2026,9,30))).Card);
        await service.CloseDayAsync();user.Role=UserRole.Admin;
        await service.CorrectDailyAsync(new(){CustomerId=id,Amount=90,Reason="Bitirilmiş borc"});
        Assert.Equal(75,(await service.GetByCustomerIdAsync(id)).RemainingDebt);
        var entry=await db.CustomerAccountEntries.FirstAsync(e=>e.EntryType==CustomerAccountEntryType.Debt);entry.BusinessDate=new(2026,9,29);await db.SaveChangesAsync();
        await service.CorrectDailyAsync(new(){CustomerId=id,Amount=110,Date=new(2026,9,29),Reason="Keçmiş gün düzəlişi"});
        user.Role=UserRole.Driver;
        await Assert.ThrowsAsync<ForbiddenException>(()=>service.CorrectDailyAsync(new(){CustomerId=id,Amount=120,Date=new(2026,9,29),Reason="Keçmiş gün"}));
    }

    [Theory]
    [InlineData(90,0,50,300,60)]
    [InlineData(120,20,30,300,30)]
    [InlineData(160,50,0,290,0)]
    public async Task HistorySeparatesOldDailyDebtAndItsPayment(decimal payment,decimal paidCarry,decimal remainingCarry,decimal oldRemaining,decimal dailyRemaining)
    {
        var (db,user,service,id)=Setup();using var dispose=db;
        await service.CreateTodayAsync(new(){CustomerId=id,InitialPreviousDebt=300,TodayDebt=100});
        await service.RecordPaymentAsync(new(){CustomerId=id,Amount=50,PaymentMethod="cash"});
        foreach(var entry in await db.CustomerAccountEntries.ToListAsync())entry.BusinessDate=new(2026,9,29);
        await db.SaveChangesAsync();
        await service.CreateTodayAsync(new(){CustomerId=id,TodayDebt=100});
        await service.RecordPaymentAsync(new(){CustomerId=id,Amount=payment,PaymentMethod="card"});
        var today=(await service.GetByCustomerIdAsync(id)).Days.First();
        Assert.Equal(350,today.OpeningDebt);Assert.Equal(300,today.OpeningOldDebt);
        Assert.Equal(50,today.OpeningCarriedDailyDebt);Assert.Equal(paidCarry,today.PaidFromCarriedDailyDebt);
        Assert.Equal(remainingCarry,today.CarriedDailyDebt);Assert.Equal(oldRemaining,today.OldDebtRemaining);
        Assert.Equal(dailyRemaining,today.TodayDebtRemaining+today.CarriedDailyDebt);
        Assert.Equal(0,today.CarriedDailyTransferredToOld);
    }

    [Fact]
    public async Task ExpiredDailyDebtIsShownAsTransferredRatherThanPaid()
    {
        var (db,user,service,id)=Setup();using var dispose=db;
        await service.CreateTodayAsync(new(){CustomerId=id,InitialPreviousDebt=300,TodayDebt=100});
        await service.RecordPaymentAsync(new(){CustomerId=id,Amount=50,PaymentMethod="cash"});
        foreach(var entry in await db.CustomerAccountEntries.ToListAsync())entry.BusinessDate=new(2026,9,25);
        await db.SaveChangesAsync();
        await service.RecordPaymentAsync(new(){CustomerId=id,Amount=30,PaymentMethod="card"});
        var today=(await service.GetByCustomerIdAsync(id)).Days.First();
        Assert.Equal(350,today.OpeningOldDebt);Assert.Equal(350,today.OpeningDebt);
        Assert.Equal(0,today.OpeningCarriedDailyDebt);Assert.Equal(0,today.PaidFromCarriedDailyDebt);
        Assert.Equal(50,today.CarriedDailyTransferredToOld);Assert.Equal(320,today.ClosingDebt);
    }
}
