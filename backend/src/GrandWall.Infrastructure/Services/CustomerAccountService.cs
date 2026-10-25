using System.Data;
using System.Globalization;
using Microsoft.EntityFrameworkCore;
using GrandWall.Application.Abstractions.CustomerAccounts;
using GrandWall.Application.Abstractions.Identity;
using GrandWall.Application.Common.Exceptions;
using GrandWall.Application.Features.CustomerAccounts.Dtos;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Persistence;

namespace GrandWall.Infrastructure.Services;

/// <summary>
/// Customer açot. Money is an append-only journal of <see cref="CustomerAccountEntry"/> rows;
/// every balance is replayed from it by <see cref="AccountLedger"/>.
/// </summary>
public sealed partial class CustomerAccountService(AppDbContext db, ICurrentUserService user, TimeProvider clock) : ICustomerAccountService
{
    private static readonly UserRole[] AccountRoles = [UserRole.Admin, UserRole.Accountant, UserRole.Driver];

    /// <summary>The açot date: the calendar date in Baku (UTC+4).</summary>
    private DateOnly Today => DateOnly.FromDateTime(clock.GetUtcNow().ToOffset(TimeSpan.FromHours(4)).DateTime);

    private void Allow(params UserRole[] roles)
    {
        if (!roles.Contains(user.Role)) throw new ForbiddenException("Bu əməliyyat üçün icazəniz yoxdur.");
    }

    private static void Money(decimal amount)
    {
        if (amount < 0 || amount > 9999999999999999.99m || decimal.Round(amount, 2) != amount)
            throw new ConflictException("Məbləğ mənfi ola bilməz və ən çox iki qəpik rəqəmi olmalıdır.");
    }

    private static LedgerItem ToItem(CustomerAccountEntry e) => new(e.EntryType, e.Amount, e.BusinessDate, e.CreatedAtUtc);

    private static IEnumerable<LedgerItem> Items(IEnumerable<CustomerAccountEntry> entries) => entries.Select(ToItem);

    private static decimal Sum(IEnumerable<CustomerAccountEntry> entries, params CustomerAccountEntryType[] types)
        => entries.Where(e => types.Contains(e.EntryType)).Sum(e => e.Amount);

    private static decimal Method(IEnumerable<CustomerAccountEntry> entries, string method)
        => entries.Where(e => e.EntryType == CustomerAccountEntryType.Payment && e.PaymentMethod == method).Sum(e => e.Amount);

    private CustomerAccountEntry NewEntry(Guid customerId, CustomerAccountEntryType type, decimal amount, DateOnly date, string? note, string? method = null) => new()
    {
        CustomerId = customerId, EntryType = type, Amount = amount, BusinessDate = date, Note = note, PaymentMethod = method,
        RecordedByUserId = user.UserId, RecordedByFullName = user.FullName, RecordedByRole = user.Role
    };

    /// <summary>Every balance must stay non-negative after a correction, on every date.</summary>
    private static void EnsureValidBalances(IReadOnlyCollection<CustomerAccountEntry> entries)
    {
        var items = Items(entries).ToList();
        foreach (var date in items.Select(i => i.Date).Distinct())
        {
            var closing = AccountLedger.Closing(items, date);
            if (closing.Old < 0 || closing.Daily < 0)
                throw new ConflictException("Düzəliş borcu mənfiyə salır və ya sonrakı ödənişlərlə uyğun gəlmir.");
        }
    }

    private async Task<T> InTransaction<T>(Func<Task<T>> action, CancellationToken ct)
    {
        T result = default!;
        await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
            result = await action();
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        });
        return result;
    }

    private async Task Mutate(Guid customerId, Func<Customer, List<CustomerAccountEntry>, Task> action, CancellationToken ct)
    {
        await InTransaction(async () =>
        {
            var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == customerId, ct)
                ?? throw new NotFoundException("Müştəri tapılmadı.");
            var entries = await db.CustomerAccountEntries.Where(e => e.CustomerId == customerId).ToListAsync(ct);
            await action(customer, entries);
            return 0;
        }, ct);
    }

    /// <summary>Marks today's açot as started and reopens it when it was already finished.</summary>
    private async Task TouchTodayAsync(CancellationToken ct)
    {
        var day = await db.AccountDays.FirstOrDefaultAsync(d => d.BusinessDate == Today, ct);
        if (day is null)
        {
            db.AccountDays.Add(new AccountDay
            {
                BusinessDate = Today,
                StartedAtUtc = clock.GetUtcNow().UtcDateTime,
                StartedByUserId = user.UserId,
                StartedByFullName = user.FullName
            });
        }
        else if (day.ClosedAtUtc.HasValue)
        {
            day.ClosedAtUtc = null;
            day.ClosedByUserId = null;
            day.ClosedByFullName = null;
        }
    }

    // ---------------------------------------------------------------- day view

    public async Task<AccountDayDto> GetDayAsync(DateOnly date, CancellationToken cancellationToken = default)
    {
        Allow(AccountRoles);
        if (date > Today) throw new ConflictException("Gələcək tarix üçün açot yoxdur.");

        var entries = await db.CustomerAccountEntries.AsNoTracking().Where(e => e.BusinessDate <= date).ToListAsync(cancellationToken);
        var settlements = await db.AccountSettlements.AsNoTracking().Where(s => s.BusinessDate == date).ToListAsync(cancellationToken);
        var byCustomer = entries.GroupBy(e => e.CustomerId).ToDictionary(g => g.Key, g => g.ToList());

        var roster = new HashSet<Guid>(entries.Where(e => e.BusinessDate == date).Select(e => e.CustomerId));
        roster.UnionWith(settlements.Select(s => s.CustomerId));
        foreach (var (id, list) in byCustomer)
            if (AccountLedger.Opening(Items(list), date).Daily > 0) roster.Add(id);

        var customers = await db.Customers.AsNoTracking().Where(c => roster.Contains(c.Id)).ToListAsync(cancellationToken);
        var rows = customers
            .Select(c => Row(c, byCustomer.GetValueOrDefault(c.Id) ?? [], settlements.Where(s => s.CustomerId == c.Id).ToList(), date))
            .OrderBy(r => r.IsDone).ThenBy(r => r.CustomerName, StringComparer.CurrentCultureIgnoreCase)
            .ToList();

        var day = await db.AccountDays.AsNoTracking().FirstOrDefaultAsync(d => d.BusinessDate == date, cancellationToken);
        var state = day is null ? (rows.Count > 0 ? "open" : "notStarted") : day.ClosedAtUtc.HasValue ? "closed" : "open";

        return new AccountDayDto
        {
            BusinessDate = date,
            State = state,
            IsToday = date == Today,
            IsLocked = date < Today,
            StartedByFullName = day?.StartedByFullName,
            StartedAtUtc = day?.StartedAtUtc,
            ClosedByFullName = day?.ClosedByFullName,
            ClosedAtUtc = day?.ClosedAtUtc,
            Cash = rows.Sum(r => r.Cash),
            Card = rows.Sum(r => r.Card),
            Collected = rows.Sum(r => r.Paid),
            Bonus = rows.Sum(r => r.Bonus),
            ReturnCredit = rows.Sum(r => r.ReturnCredit),
            NewDailyDebt = rows.Sum(r => r.NewDailyDebt),
            CustomerCount = rows.Count,
            DoneCount = rows.Count(r => r.IsDone),
            Customers = rows
        };
    }

    private static AccountDayCustomerDto Row(Customer customer, IReadOnlyList<CustomerAccountEntry> entries, IReadOnlyList<AccountSettlement> settlements, DateOnly date)
    {
        var items = Items(entries.Where(e => e.BusinessDate <= date)).ToList();
        var opening = AccountLedger.Opening(items, date);
        var closing = AccountLedger.Closing(items, date);
        var day = entries.Where(e => e.BusinessDate == date).ToList();

        var newDaily = Sum(day, CustomerAccountEntryType.Debt, CustomerAccountEntryType.DailyIncrease) - Sum(day, CustomerAccountEntryType.DailyDecrease);
        var oldToday = Sum(day, CustomerAccountEntryType.OpeningBalance, CustomerAccountEntryType.AdjustmentIncrease) - Sum(day, CustomerAccountEntryType.AdjustmentDecrease);
        var settlement = settlements.OrderByDescending(s => s.CreatedAtUtc).FirstOrDefault();
        var reopened = settlement is not null && day.Any(e =>
            e.CreatedAtUtc > settlement.CreatedAtUtc &&
            e.EntryType is CustomerAccountEntryType.Debt or CustomerAccountEntryType.DailyIncrease);

        return new AccountDayCustomerDto
        {
            CustomerId = customer.Id,
            CustomerName = customer.Name,
            PhoneNumber = customer.PhoneNumber,
            OldDebt = opening.Old + oldToday,
            DailyDebt = opening.Daily + newDaily,
            NewDailyDebt = newDaily,
            Cash = Method(day, "cash"),
            Card = Method(day, "card"),
            Bonus = Sum(day, CustomerAccountEntryType.Bonus),
            ReturnCredit = Sum(day, CustomerAccountEntryType.ReturnCredit) - Sum(day, CustomerAccountEntryType.CreditReversal),
            RemainingOld = closing.Old,
            RemainingDaily = closing.Daily,
            Advance = closing.Advance,
            IsDone = settlement is not null && !reopened,
            CarryToTomorrow = settlement is { CarryToTomorrow: true } && closing.Daily > 0,
            HasOldDebtRecord = entries.Any(e => e.EntryType == CustomerAccountEntryType.OpeningBalance)
        };
    }

    public async Task<AccountDayDto> StartDayAsync(CancellationToken cancellationToken = default)
    {
        Allow(AccountRoles);
        await InTransaction(async () => { await TouchTodayAsync(cancellationToken); return 0; }, cancellationToken);
        return await GetDayAsync(Today, cancellationToken);
    }

    public async Task<AccountDayDto> CloseDayAsync(CancellationToken cancellationToken = default)
    {
        Allow(AccountRoles);
        await InTransaction(async () =>
        {
            var day = await db.AccountDays.FirstOrDefaultAsync(d => d.BusinessDate == Today, cancellationToken);
            if (day is null)
            {
                day = new AccountDay
                {
                    BusinessDate = Today,
                    StartedAtUtc = clock.GetUtcNow().UtcDateTime,
                    StartedByUserId = user.UserId,
                    StartedByFullName = user.FullName
                };
                db.AccountDays.Add(day);
            }
            if (day.ClosedAtUtc is null)
            {
                day.ClosedAtUtc = clock.GetUtcNow().UtcDateTime;
                day.ClosedByUserId = user.UserId;
                day.ClosedByFullName = user.FullName;
            }
            return 0;
        }, cancellationToken);
        return await GetDayAsync(Today, cancellationToken);
    }

    // ---------------------------------------------------------------- daily debts

    public async Task<AccountDayDto> SaveDailyDebtsAsync(SaveDailyDebtsRequestDto request, CancellationToken cancellationToken = default)
    {
        Allow(AccountRoles);
        foreach (var item in request.Items)
        {
            Money(item.DailyDebt);
            Money(item.OldDebt ?? 0);
        }

        await InTransaction(async () =>
        {
            var ids = request.Items.Select(i => i.CustomerId).ToList();
            var customers = await db.Customers.Where(c => ids.Contains(c.Id)).ToListAsync(cancellationToken);
            if (customers.Count != ids.Count) throw new NotFoundException("Müştəri tapılmadı.");
            var entries = await db.CustomerAccountEntries.Where(e => ids.Contains(e.CustomerId)).ToListAsync(cancellationToken);
            var changed = false;

            foreach (var item in request.Items)
            {
                var customer = customers.Single(c => c.Id == item.CustomerId);
                var own = entries.Where(e => e.CustomerId == item.CustomerId).ToList();
                var oldDebt = item.OldDebt.GetValueOrDefault();

                if (oldDebt > 0)
                {
                    if (user.Role is not (UserRole.Admin or UserRole.Accountant))
                        throw new ForbiddenException("Köhnə borcu yalnız admin və ya açot operatoru yaza bilər.");
                    if (own.Any(e => e.EntryType == CustomerAccountEntryType.OpeningBalance))
                        throw new ConflictException($"{customer.Name}: köhnə borc artıq yazılıb. Dəyişmək üçün düzəliş edin.");
                    EnsureUsable(customer);
                    var opening = NewEntry(customer.Id, CustomerAccountEntryType.OpeningBalance, oldDebt, Today, "İlkin köhnə borc");
                    db.Add(opening);
                    own.Add(opening);
                    entries.Add(opening);
                    changed = true;
                }

                var todayDaily = own.Where(e => e.BusinessDate == Today).ToList();
                var current = Sum(todayDaily, CustomerAccountEntryType.Debt, CustomerAccountEntryType.DailyIncrease) - Sum(todayDaily, CustomerAccountEntryType.DailyDecrease);
                var delta = item.DailyDebt - current;
                if (delta == 0) continue;

                if (delta > 0) EnsureUsable(customer);
                var hasDebt = todayDaily.Any(e => e.EntryType == CustomerAccountEntryType.Debt);
                var type = delta > 0
                    ? (hasDebt ? CustomerAccountEntryType.DailyIncrease : CustomerAccountEntryType.Debt)
                    : CustomerAccountEntryType.DailyDecrease;
                var note = hasDebt || delta < 0 ? $"Günlük borc: {current:0.00} → {item.DailyDebt:0.00} AZN" : null;
                var entry = NewEntry(customer.Id, type, Math.Abs(delta), Today, note);
                db.Add(entry);
                entries.Add(entry);
                if (note is not null)
                    db.AccountEntryAudits.Add(new AccountEntryAudit { CustomerId = customer.Id, EntryId = entry.Id, UserId = user.UserId, UserName = user.FullName, Description = note });
                changed = true;
            }

            foreach (var group in entries.GroupBy(e => e.CustomerId)) EnsureValidBalances(group.ToList());
            if (changed) await TouchTodayAsync(cancellationToken);
            return 0;
        }, cancellationToken);

        return await GetDayAsync(Today, cancellationToken);
    }

    private static void EnsureUsable(Customer customer)
    {
        if (customer.IsDeleted || !customer.IsActive)
            throw new ConflictException($"{customer.Name} deaktivdir və yeni borc ala bilməz.");
    }

    // ---------------------------------------------------------------- customer list / details

    public async Task<CustomerAccountListDto> GetAllAsync(CustomerAccountListQueryDto query, CancellationToken cancellationToken = default)
    {
        Allow(AccountRoles);
        var date = query.Date ?? Today;
        var search = query.Search?.Trim();
        var customers = await db.Customers.AsNoTracking()
            .Where(c => search == null || search == "" || c.Name.Contains(search))
            .ToListAsync(cancellationToken);
        var ids = customers.Select(c => c.Id).ToList();
        var entries = await db.CustomerAccountEntries.AsNoTracking()
            .Where(e => ids.Contains(e.CustomerId) && e.BusinessDate <= date)
            .ToListAsync(cancellationToken);
        var byCustomer = entries.GroupBy(e => e.CustomerId).ToDictionary(g => g.Key, g => g.ToList());

        var summaries = customers
            .Select(c => Summary(c, byCustomer.GetValueOrDefault(c.Id) ?? [], date))
            // Only Sədərək customers are offered; anyone who still owes money (or has credit) stays visible.
            .Where(s => (s.IsAccountCustomer && !s.IsDeleted) || s.OldDebt != 0 || s.DailyDebt != 0 || s.Advance != 0)
            .OrderBy(s => s.Dto.CustomerName, StringComparer.CurrentCultureIgnoreCase)
            .ToList();

        return new CustomerAccountListDto
        {
            Items = summaries.Skip((query.PageNumber - 1) * query.PageSize).Take(query.PageSize).Select(s => s.Dto).ToList(),
            BusinessDate = date,
            TotalCount = summaries.Count,
            PageNumber = query.PageNumber,
            PageSize = query.PageSize
        };
    }

    private sealed record SummaryRow(CustomerAccountSummaryDto Dto, bool IsAccountCustomer, bool IsDeleted)
    {
        public decimal OldDebt => Dto.OldDebt;
        public decimal DailyDebt => Dto.DailyDebt;
        public decimal Advance => Dto.Advance;
    }

    private static SummaryRow Summary(Customer customer, List<CustomerAccountEntry> entries, DateOnly date)
    {
        var closing = AccountLedger.Closing(Items(entries), date);
        var dto = new CustomerAccountSummaryDto
        {
            CustomerId = customer.Id,
            CustomerName = customer.Name,
            PhoneNumber = customer.PhoneNumber,
            IsActive = customer.IsActive,
            OldDebt = closing.Old,
            DailyDebt = closing.Daily,
            Advance = closing.Advance,
            HasOldDebtRecord = entries.Any(e => e.EntryType == CustomerAccountEntryType.OpeningBalance)
        };
        return new SummaryRow(dto, customer.IsAccountCustomer, customer.IsDeleted);
    }

    public async Task<CustomerAccountDetailsDto> GetByCustomerIdAsync(Guid customerId, CancellationToken cancellationToken = default)
    {
        Allow(AccountRoles);
        var customer = await db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == customerId, cancellationToken)
            ?? throw new NotFoundException("Müştəri tapılmadı.");
        var entries = await db.CustomerAccountEntries.AsNoTracking().Where(e => e.CustomerId == customerId)
            .OrderBy(e => e.BusinessDate).ThenBy(e => e.CreatedAtUtc).ToListAsync(cancellationToken);
        var audits = await db.AccountEntryAudits.AsNoTracking().Where(a => a.CustomerId == customerId)
            .OrderByDescending(a => a.CreatedAtUtc).Take(100).ToListAsync(cancellationToken);
        var today = Today;
        var closing = AccountLedger.Closing(Items(entries), today);

        var days = entries.GroupBy(e => e.BusinessDate).OrderByDescending(g => g.Key).Take(120).Select(g =>
        {
            var items = Items(entries.Where(e => e.BusinessDate <= g.Key)).ToList();
            var opening = AccountLedger.Opening(items, g.Key);
            var dayEnd = AccountLedger.Closing(items, g.Key);
            var oldToday = Sum(g, CustomerAccountEntryType.OpeningBalance, CustomerAccountEntryType.AdjustmentIncrease) - Sum(g, CustomerAccountEntryType.AdjustmentDecrease);
            var newDaily = Sum(g, CustomerAccountEntryType.Debt, CustomerAccountEntryType.DailyIncrease) - Sum(g, CustomerAccountEntryType.DailyDecrease);
            return new CustomerAccountDayDto
            {
                BusinessDate = g.Key,
                OldDebt = opening.Old + oldToday,
                DailyDebt = opening.Daily + newDaily,
                Cash = Method(g, "cash"),
                Card = Method(g, "card"),
                Bonus = Sum(g, CustomerAccountEntryType.Bonus),
                ReturnCredit = Sum(g, CustomerAccountEntryType.ReturnCredit) - Sum(g, CustomerAccountEntryType.CreditReversal),
                RemainingDebt = dayEnd.Total,
                IsLocked = g.Key < today,
                Entries = g.OrderByDescending(e => e.CreatedAtUtc).Select(MapEntry).ToList()
            };
        }).ToList();

        return new CustomerAccountDetailsDto
        {
            CustomerId = customer.Id,
            CustomerName = customer.Name,
            PhoneNumber = customer.PhoneNumber,
            IsActive = customer.IsActive,
            OldDebt = closing.Old,
            DailyDebt = closing.Daily,
            Advance = closing.Advance,
            HasOldDebtRecord = entries.Any(e => e.EntryType == CustomerAccountEntryType.OpeningBalance),
            Audit = audits.Select(a => new AccountAuditDto(a.EntryId, a.UserName, a.Description, a.CreatedAtUtc)).ToList(),
            Days = days
        };
    }

    private static CustomerAccountEntryDto MapEntry(CustomerAccountEntry e) => new()
    {
        Id = e.Id, CustomerId = e.CustomerId, EntryType = e.EntryType, PaymentMethod = e.PaymentMethod, Amount = e.Amount,
        BusinessDate = e.BusinessDate, Note = e.Note, RecordedByFullName = e.RecordedByFullName, CreatedAtUtc = e.CreatedAtUtc
    };

    // ---------------------------------------------------------------- history

    private static (DateOnly From, DateOnly To) MonthRange(string month)
    {
        if (!DateOnly.TryParseExact(month + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var from))
            throw new ConflictException("Ay düzgün deyil. Format: 2026-10.");
        return (from, from.AddMonths(1).AddDays(-1));
    }

    public async Task<AccountHistoryMonthDto> GetHistoryAsync(string month, CancellationToken cancellationToken = default)
    {
        Allow(AccountRoles);
        var (from, to) = MonthRange(month);
        var entries = await db.CustomerAccountEntries.AsNoTracking()
            .Where(e => e.BusinessDate >= from && e.BusinessDate <= to).ToListAsync(cancellationToken);
        var days = await db.AccountDays.AsNoTracking().Where(d => d.BusinessDate >= from && d.BusinessDate <= to).ToListAsync(cancellationToken);
        var dates = entries.Select(e => e.BusinessDate).Concat(days.Select(d => d.BusinessDate)).Distinct().OrderByDescending(d => d);

        var result = dates.Select(date =>
        {
            var day = entries.Where(e => e.BusinessDate == date).ToList();
            var row = days.FirstOrDefault(d => d.BusinessDate == date);
            return new AccountHistoryDayDto(date, Sum(day, CustomerAccountEntryType.Payment), Method(day, "cash"), Method(day, "card"),
                day.Select(e => e.CustomerId).Distinct().Count(), row?.ClosedAtUtc.HasValue == true);
        }).ToList();

        return new AccountHistoryMonthDto
        {
            Month = month,
            Collected = result.Sum(d => d.Collected),
            Cash = result.Sum(d => d.Cash),
            Card = result.Sum(d => d.Card),
            Days = result
        };
    }

    public async Task<CustomerMonthDto> GetCustomerMonthAsync(Guid customerId, string month, CancellationToken cancellationToken = default)
    {
        Allow(AccountRoles);
        var (from, to) = MonthRange(month);
        var customer = await db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == customerId, cancellationToken)
            ?? throw new NotFoundException("Müştəri tapılmadı.");
        var entries = await db.CustomerAccountEntries.AsNoTracking().Where(e => e.CustomerId == customerId && e.BusinessDate <= to)
            .ToListAsync(cancellationToken);

        var days = entries.Where(e => e.BusinessDate >= from).GroupBy(e => e.BusinessDate).OrderByDescending(g => g.Key).Select(g =>
        {
            var items = Items(entries.Where(e => e.BusinessDate <= g.Key)).ToList();
            var opening = AccountLedger.Opening(items, g.Key);
            var closing = AccountLedger.Closing(items, g.Key);
            var oldToday = Sum(g, CustomerAccountEntryType.OpeningBalance, CustomerAccountEntryType.AdjustmentIncrease) - Sum(g, CustomerAccountEntryType.AdjustmentDecrease);
            var newDaily = Sum(g, CustomerAccountEntryType.Debt, CustomerAccountEntryType.DailyIncrease) - Sum(g, CustomerAccountEntryType.DailyDecrease);
            return new CustomerMonthDayDto(g.Key, opening.Old + oldToday, opening.Daily + newDaily, Method(g, "cash"), Method(g, "card"),
                Sum(g, CustomerAccountEntryType.Bonus),
                Sum(g, CustomerAccountEntryType.ReturnCredit) - Sum(g, CustomerAccountEntryType.CreditReversal), closing.Total);
        }).ToList();

        return new CustomerMonthDto
        {
            CustomerId = customer.Id,
            CustomerName = customer.Name,
            Month = month,
            Cash = days.Sum(d => d.Cash),
            Card = days.Sum(d => d.Card),
            Collected = days.Sum(d => d.Cash + d.Card),
            Bonus = days.Sum(d => d.Bonus),
            ReturnCredit = days.Sum(d => d.ReturnCredit),
            Remaining = AccountLedger.Closing(Items(entries), to > Today ? Today : to).Total,
            Days = days
        };
    }
}
