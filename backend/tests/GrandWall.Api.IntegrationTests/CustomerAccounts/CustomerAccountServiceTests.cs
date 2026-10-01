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
        await Assert.ThrowsAsync<ConflictException>(() => service.RecordPaymentAsync(new() { CustomerId = id, Amount = 1, PaymentMethod = "cash" }));
        Assert.Equal(150, (await service.CloseDayAsync()).Total);
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
    public async Task DriverCanCreateDailyButCannotSetOldDebtOrCorrectAndAccountantCannotCollect()
    {
        var (db, user, service, id) = Setup(); using var dispose = db;
        user.Role = UserRole.Driver;
        await Assert.ThrowsAsync<ForbiddenException>(() => service.CreateTodayAsync(new() { CustomerId = id, TodayDebt = 100, InitialPreviousDebt = 300 }));
        await service.CreateTodayAsync(new() { CustomerId = id, TodayDebt = 100 });
        await Assert.ThrowsAsync<ForbiddenException>(() => service.CorrectDailyAsync(new() { CustomerId = id, Amount = 10, Reason = "Düzəliş" }));
        user.UserId = Guid.NewGuid();
        user.Role = UserRole.Accountant;
        await Assert.ThrowsAsync<ForbiddenException>(() => service.CorrectPreviousDebtAsync(new() {CustomerId=id, CorrectedPreviousDebt=10,Reason="Düzəliş"}));
        await Assert.ThrowsAsync<ForbiddenException>(() => service.CorrectDailyAsync(new() {CustomerId=id,Amount=90,Reason="Başqasının borcu"}));
        user.Role=UserRole.Manager;
        await Assert.ThrowsAsync<ForbiddenException>(()=>service.GetByCustomerIdAsync(id));
        await Assert.ThrowsAsync<ForbiddenException>(()=>service.GetReportHistoryAsync());
        user.Role=UserRole.Accountant;
        await Assert.ThrowsAsync<ForbiddenException>(() => service.RecordPaymentAsync(new() { CustomerId = id, Amount = 1, PaymentMethod = "cash" }));
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
}
