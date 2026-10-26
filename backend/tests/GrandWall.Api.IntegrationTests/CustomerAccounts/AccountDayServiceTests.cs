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

// InMemory does not emulate SQL Server's serializable locking; these cover the rules and the persistence.
public sealed class AccountDayServiceTests
{
    private sealed class Actor : ICurrentUserService
    {
        public bool IsAuthenticated => true;
        public Guid UserId { get; } = Guid.NewGuid();
        public string FullName => "Açot işçisi";
        public string Username => "account.worker";
        public UserRole Role { get; set; } = UserRole.Accountant;
    }

    private sealed class Clock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2026, 10, 27, 8, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private sealed class Fixture : IDisposable
    {
        public AppDbContext Db { get; }
        public Actor User { get; } = new();
        public Clock Clock { get; } = new();
        public CustomerAccountService Service { get; }
        public Customer Filman { get; } = new() { Name = "Filman Məcid", IsAccountCustomer = true };
        public Customer Rafil { get; } = new() { Name = "Rafil İtalux", IsAccountCustomer = true };
        public Customer Outsider { get; } = new() { Name = "Başqa dükan" };

        public Fixture()
        {
            Db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options);
            Db.Customers.AddRange(Filman, Rafil, Outsider);
            Db.SaveChanges();
            Service = new CustomerAccountService(Db, User, Clock);
        }

        public DateOnly Today => DateOnly.FromDateTime(Clock.Now.ToOffset(TimeSpan.FromHours(4)).DateTime);

        public Task<AccountDayDto> Debts(Customer customer, decimal daily, decimal? old = null)
            => Service.SaveDailyDebtsAsync(new SaveDailyDebtsRequestDto
            {
                Items = [new DailyDebtItemDto { CustomerId = customer.Id, DailyDebt = daily, OldDebt = old }]
            });

        public Task<CustomerAccountDetailsDto> Settle(Customer customer, decimal cash = 0, decimal card = 0, bool carry = false,
            decimal bonus = 0, params SettlementReturnDto[] returns)
            => Service.CompleteSettlementAsync(new CompleteSettlementRequest
            {
                OperationId = Guid.NewGuid(), CustomerId = customer.Id, Cash = cash, Card = card, Bonus = bonus,
                CarryToTomorrow = carry, Returns = [.. returns]
            });

        public void Dispose() => Db.Dispose();
    }

    [Fact]
    public async Task SavingDailyDebtsWritesOldDebtOnceAndIsIdempotent()
    {
        using var f = new Fixture();

        var day = await f.Debts(f.Filman, 250, old: 300);
        await f.Debts(f.Filman, 250);

        var row = Assert.Single(day.Customers);
        Assert.Equal(300, row.OldDebt);
        Assert.Equal(250, row.TodayDebt);
        Assert.Equal(550, row.Due);
        Assert.False(row.IsDone);
        Assert.Equal(2, await f.Db.CustomerAccountEntries.CountAsync());
        await Assert.ThrowsAsync<ConflictException>(() => f.Debts(f.Filman, 250, old: 100));
    }

    [Fact]
    public async Task ChangingTheDailyDebtPostsOnlyTheDifference()
    {
        using var f = new Fixture();
        await f.Debts(f.Filman, 250);

        await f.Debts(f.Filman, 300);
        var day = await f.Debts(f.Filman, 280);

        Assert.Equal(280, day.Customers.Single().TodayDebt);
        Assert.Equal(280, day.NewDailyDebt);
    }

    [Fact]
    public async Task OnlyAccountCustomersAreListedUnlessTheyStillOweMoney()
    {
        using var f = new Fixture();

        var list = await f.Service.GetAllAsync(new CustomerAccountListQueryDto());
        Assert.DoesNotContain(list.Items, c => c.CustomerId == f.Outsider.Id);
        Assert.Equal(2, list.TotalCount);

        f.Outsider.IsActive = true;
        f.Db.CustomerAccountEntries.Add(new CustomerAccountEntry
        {
            CustomerId = f.Outsider.Id, EntryType = CustomerAccountEntryType.OpeningBalance, Amount = 80,
            BusinessDate = f.Today, RecordedByUserId = f.User.UserId, RecordedByFullName = "x"
        });
        await f.Db.SaveChangesAsync();

        list = await f.Service.GetAllAsync(new CustomerAccountListQueryDto());
        Assert.Contains(list.Items, c => c.CustomerId == f.Outsider.Id && c.RemainingDebt == 80);
    }

    [Fact]
    public async Task SettlementAppliesMixedPaymentAndMarksTheCustomerDone()
    {
        using var f = new Fixture();
        await f.Debts(f.Filman, 250, old: 300);

        await f.Settle(f.Filman, cash: 200, card: 150);
        var row = Assert.Single((await f.Service.GetDayAsync(f.Today)).Customers);

        Assert.True(row.IsDone);
        Assert.Equal(200, row.Cash);
        Assert.Equal(150, row.Card);
        Assert.Equal(200, row.Remaining);
        Assert.Equal(200, row.RemainingOld);
        Assert.Equal(0, row.RemainingToday);
        Assert.Equal(0, row.RemainingCarried);
    }

    [Fact]
    public async Task UnpaidDailyDebtBecomesOldDebtUnlessKeptForTomorrow()
    {
        using var f = new Fixture();
        await f.Debts(f.Filman, 250);
        await f.Debts(f.Rafil, 100);

        await f.Settle(f.Filman, cash: 100);                 // rest moves to old debt
        await f.Settle(f.Rafil, cash: 40, carry: true);      // rest stays for tomorrow

        f.Clock.Now = f.Clock.Now.AddDays(1);
        var tomorrow = await f.Service.GetDayAsync(f.Today);

        var filman = tomorrow.Customers.SingleOrDefault(c => c.CustomerId == f.Filman.Id);
        Assert.Null(filman);                                  // nothing carried, so not on tomorrow's roster

        var rafil = Assert.Single(tomorrow.Customers);
        Assert.Equal(f.Rafil.Id, rafil.CustomerId);
        Assert.Equal(60, rafil.CarriedDebt);                  // kept yesterday: shown as its own line
        Assert.Equal(0, rafil.TodayDebt);
        Assert.False(rafil.IsDone);

        var details = await f.Service.GetByCustomerIdAsync(f.Filman.Id);
        Assert.Equal(150, details.OldDebt);
        Assert.Equal(0, details.CarriedDebt);
        Assert.Equal(0, details.TodayDebt);
    }

    [Fact]
    public async Task KeptBalanceStaysSeparateFromTodaysDebt()
    {
        using var f = new Fixture();
        await f.Debts(f.Rafil, 100);
        await f.Settle(f.Rafil, cash: 40, carry: true);
        f.Clock.Now = f.Clock.Now.AddDays(1);

        var day = await f.Debts(f.Rafil, 70);

        var row = Assert.Single(day.Customers);
        Assert.Equal(60, row.CarriedDebt);
        Assert.Equal(70, row.TodayDebt);
        Assert.Equal(130, row.Due);
    }

    [Fact]
    public async Task KeptDebtShowsOnTheNextDayAndJoinsTheOldDebtIfStillUnpaid()
    {
        using var f = new Fixture();
        await f.Debts(f.Rafil, 100);
        await f.Settle(f.Rafil, cash: 40, carry: true);                 // 60 kept for tomorrow

        f.Clock.Now = f.Clock.Now.AddDays(1);
        var secondDay = Assert.Single((await f.Service.GetDayAsync(f.Today)).Customers);
        Assert.Equal(60, secondDay.CarriedDebt);
        Assert.Equal(0, secondDay.OldDebt);

        await f.Debts(f.Rafil, 50);                                      // new debt today
        await f.Settle(f.Rafil, cash: 10, carry: true);                  // keep today's rest again

        f.Clock.Now = f.Clock.Now.AddDays(1);
        var thirdDay = Assert.Single((await f.Service.GetDayAsync(f.Today)).Customers);
        Assert.Equal(60, thirdDay.OldDebt);                              // yesterday's carried 60 joined the old debt
        Assert.Equal(40, thirdDay.CarriedDebt);                          // only today's 40 was kept
    }

    [Fact]
    public async Task OldAndDailyDebtCanBeAddedAndSetWithAReason()
    {
        using var f = new Fixture();

        var added = await f.Service.AdjustDebtAsync(new AdjustDebtRequestDto { CustomerId = f.Filman.Id, Target = "old", Mode = "add", Amount = 300, Reason = "İlkin köhnə borc" });
        Assert.Equal(300, added.OldDebt);
        added = await f.Service.AdjustDebtAsync(new AdjustDebtRequestDto { CustomerId = f.Filman.Id, Target = "old", Mode = "add", Amount = 50, Reason = "Əlavə köhnə borc" });
        Assert.Equal(350, added.OldDebt);
        added = await f.Service.AdjustDebtAsync(new AdjustDebtRequestDto { CustomerId = f.Filman.Id, Target = "old", Mode = "set", Amount = 320, Reason = "Düzəliş" });
        Assert.Equal(320, added.OldDebt);

        added = await f.Service.AdjustDebtAsync(new AdjustDebtRequestDto { CustomerId = f.Filman.Id, Target = "daily", Mode = "add", Amount = 100, Reason = "Axşam sifarişi" });
        added = await f.Service.AdjustDebtAsync(new AdjustDebtRequestDto { CustomerId = f.Filman.Id, Target = "daily", Mode = "add", Amount = 40, Reason = "Əlavə mal" });
        Assert.Equal(140, added.TodayDebt);
        added = await f.Service.AdjustDebtAsync(new AdjustDebtRequestDto { CustomerId = f.Filman.Id, Target = "daily", Mode = "set", Amount = 120, Reason = "Düzəliş" });
        Assert.Equal(120, added.TodayDebt);
        Assert.Equal(440, added.RemainingDebt);
        Assert.Equal(6, added.Audit.Count);
        await Assert.ThrowsAsync<ConflictException>(() => f.Service.AdjustDebtAsync(new AdjustDebtRequestDto { CustomerId = f.Filman.Id, Target = "old", Mode = "add", Amount = 10, Reason = "" }));
    }

    [Fact]
    public async Task OnlyAdminAndAccountantMayTouchTheOldDebt()
    {
        using var f = new Fixture();
        f.User.Role = UserRole.Driver;

        await Assert.ThrowsAsync<ForbiddenException>(() => f.Service.AdjustDebtAsync(new AdjustDebtRequestDto { CustomerId = f.Filman.Id, Target = "old", Mode = "add", Amount = 10, Reason = "Sınaq" }));
        var details = await f.Service.AdjustDebtAsync(new AdjustDebtRequestDto { CustomerId = f.Filman.Id, Target = "daily", Mode = "add", Amount = 10, Reason = "Sürücü əlavəsi" });

        Assert.Equal(10, details.TodayDebt);
    }

    [Fact]
    public async Task ReturnsAndBonusAreAppliedImmediatelyAndOnlyOnce()
    {
        using var f = new Fixture();
        await f.Debts(f.Filman, 300);
        var record = new ProductReturn
        {
            CustomerId = f.Filman.Id, WarehouseId = Guid.NewGuid(), CreatedByUserId = f.User.UserId
        };
        f.Db.ProductReturns.Add(record);
        await f.Db.SaveChangesAsync();

        var result = await f.Settle(f.Filman, cash: 100, bonus: 20, returns: new SettlementReturnDto { ReturnId = record.Id, Amount = 80 });

        Assert.Equal(100, result.RemainingDebt);
        var stored = await f.Db.ProductReturns.AsNoTracking().SingleAsync(r => r.Id == record.Id);
        Assert.Equal(80, stored.AppliedAmount);
        Assert.Equal(80, stored.Amount);
        await Assert.ThrowsAsync<ConflictException>(() =>
            f.Settle(f.Filman, returns: new SettlementReturnDto { ReturnId = record.Id, Amount = 80 }));
    }

    [Fact]
    public async Task ReturnOfAnotherCustomerIsRejected()
    {
        using var f = new Fixture();
        var record = new ProductReturn
        {
            CustomerId = f.Rafil.Id, WarehouseId = Guid.NewGuid(), CreatedByUserId = f.User.UserId
        };
        f.Db.ProductReturns.Add(record);
        await f.Db.SaveChangesAsync();

        await Assert.ThrowsAsync<ConflictException>(() =>
            f.Settle(f.Filman, returns: new SettlementReturnDto { ReturnId = record.Id, Amount = 10 }));
    }

    [Fact]
    public async Task RepeatingTheSameOperationDoesNotDuplicateAndChangingItIsRejected()
    {
        using var f = new Fixture();
        await f.Debts(f.Filman, 100);
        var request = new CompleteSettlementRequest { OperationId = Guid.NewGuid(), CustomerId = f.Filman.Id, Cash = 60 };

        await f.Service.CompleteSettlementAsync(request);
        await f.Service.CompleteSettlementAsync(request);

        Assert.Equal(1, await f.Db.CustomerAccountEntries.CountAsync(e => e.EntryType == CustomerAccountEntryType.Payment));
        Assert.Single(await f.Db.AccountSettlements.ToListAsync());
        await Assert.ThrowsAsync<ConflictException>(() =>
            f.Service.CompleteSettlementAsync(new CompleteSettlementRequest { OperationId = request.OperationId, CustomerId = f.Filman.Id, Cash = 61 }));
    }

    [Fact]
    public async Task MoneyBeyondTheDebtIsRecordedAsAdvance()
    {
        using var f = new Fixture();
        await f.Debts(f.Filman, 100);

        var result = await f.Settle(f.Filman, cash: 150);

        Assert.Equal(0, result.RemainingDebt);
        Assert.Equal(50, result.Advance);
    }

    [Fact]
    public async Task LateOrderAfterClosingReopensTheDayAndTheCustomer()
    {
        using var f = new Fixture();
        await f.Debts(f.Filman, 100);
        await f.Settle(f.Filman, cash: 100);
        var closed = await f.Service.CloseDayAsync();
        Assert.Equal("closed", closed.State);

        var day = await f.Debts(f.Filman, 160);                // the customer ordered more after closing

        Assert.Equal("open", day.State);
        var row = Assert.Single(day.Customers);
        Assert.False(row.IsDone);
        Assert.Equal(60, row.RemainingToday);
        Assert.Equal(100, row.Paid);
    }

    [Fact]
    public async Task ClosingTheDayReportsCashAndCardTotals()
    {
        using var f = new Fixture();
        await f.Debts(f.Filman, 300);
        await f.Debts(f.Rafil, 200);
        await f.Settle(f.Filman, cash: 100, card: 50);
        await f.Settle(f.Rafil, cash: 25);

        var day = await f.Service.CloseDayAsync();

        Assert.Equal("closed", day.State);
        Assert.Equal(175, day.Collected);
        Assert.Equal(125, day.Cash);
        Assert.Equal(50, day.Card);
        Assert.Equal(2, day.DoneCount);
    }

    [Fact]
    public async Task AFinishedDayIsLockedForEveryoneButAdmin()
    {
        using var f = new Fixture();
        await f.Debts(f.Filman, 100);
        await f.Settle(f.Filman, cash: 10);
        f.Clock.Now = f.Clock.Now.AddDays(1);
        var yesterday = f.Today.AddDays(-1);

        var past = await f.Service.GetDayAsync(yesterday);
        Assert.True(past.IsLocked);

        await Assert.ThrowsAsync<ForbiddenException>(() => f.Service.CorrectDailyAsync(new CorrectDailyDebtRequestDto
        {
            CustomerId = f.Filman.Id, Date = yesterday, Amount = 90, Reason = "Səhv yazılıb"
        }));

        f.User.Role = UserRole.Admin;
        var details = await f.Service.CorrectDailyAsync(new CorrectDailyDebtRequestDto
        {
            CustomerId = f.Filman.Id, Date = yesterday, Amount = 90, Reason = "Səhv yazılıb"
        });
        Assert.Equal(80, details.RemainingDebt);
        Assert.Single(details.Audit);
    }

    [Fact]
    public async Task OldDebtCorrectionIsClosedToDriversAndAudited()
    {
        using var f = new Fixture();
        await f.Debts(f.Filman, 100, old: 300);
        f.User.Role = UserRole.Driver;

        await Assert.ThrowsAsync<ForbiddenException>(() => f.Service.CorrectPreviousDebtAsync(new CorrectPreviousDebtRequestDto
        {
            CustomerId = f.Filman.Id, CorrectedPreviousDebt = 250, Reason = "Düzəliş"
        }));

        f.User.Role = UserRole.Admin;
        var result = await f.Service.CorrectPreviousDebtAsync(new CorrectPreviousDebtRequestDto
        {
            CustomerId = f.Filman.Id, CorrectedPreviousDebt = 250, Reason = "Düzəliş"
        });

        Assert.Equal(250, result.OldDebt);
        Assert.Equal(350, result.RemainingDebt);
        Assert.Contains(result.Audit, a => a.Description.Contains("300,00") || a.Description.Contains("300.00"));
    }

    [Fact]
    public async Task PaymentCorrectionOnlyForTodayExceptAdmin()
    {
        using var f = new Fixture();
        await f.Debts(f.Filman, 100);
        var result = await f.Settle(f.Filman, cash: 40);
        var payment = result.Days.Single().Entries.Single(e => e.EntryType == CustomerAccountEntryType.Payment);

        var corrected = await f.Service.CorrectPaymentAsync(new CorrectAccountPaymentRequestDto
        {
            CustomerId = f.Filman.Id, EntryId = payment.Id, ExpectedAmount = 40, ExpectedPaymentMethod = "cash",
            Amount = 45, PaymentMethod = "card", Reason = "Kartla ödəyib"
        });
        Assert.Equal(55, corrected.RemainingDebt);

        f.Clock.Now = f.Clock.Now.AddDays(1);
        await Assert.ThrowsAsync<ForbiddenException>(() => f.Service.CorrectPaymentAsync(new CorrectAccountPaymentRequestDto
        {
            CustomerId = f.Filman.Id, EntryId = payment.Id, ExpectedAmount = 45, ExpectedPaymentMethod = "card",
            Amount = 50, PaymentMethod = "card", Reason = "Gec düzəliş"
        }));
    }

    [Fact]
    public async Task MonthHistoryAndCustomerMonthListPaymentsByDayAndCustomer()
    {
        using var f = new Fixture();
        await f.Debts(f.Filman, 300);
        await f.Settle(f.Filman, cash: 100, card: 50);
        f.Clock.Now = f.Clock.Now.AddDays(1);
        await f.Debts(f.Filman, 100);
        await f.Settle(f.Filman, cash: 70);

        var month = await f.Service.GetHistoryAsync("2026-10");
        Assert.Equal(220, month.Collected);
        Assert.Equal(170, month.Cash);
        Assert.Equal(50, month.Card);
        Assert.Equal(2, month.Days.Count);

        var customer = await f.Service.GetCustomerMonthAsync(f.Filman.Id, "2026-10");
        Assert.Equal(220, customer.Collected);
        Assert.Equal(2, customer.Days.Count);
        Assert.Equal(180, customer.Remaining);
    }

    [Fact]
    public async Task InactiveCustomerCannotReceiveNewDebt()
    {
        using var f = new Fixture();
        f.Filman.IsActive = false;
        await f.Db.SaveChangesAsync();

        await Assert.ThrowsAsync<ConflictException>(() => f.Debts(f.Filman, 10));
    }

    [Fact]
    public async Task ManagerAndWorkerCannotUseTheAccount()
    {
        using var f = new Fixture();
        f.User.Role = UserRole.Manager;

        await Assert.ThrowsAsync<ForbiddenException>(() => f.Service.GetDayAsync(f.Today));
    }
}
