using System.Data;
using Microsoft.EntityFrameworkCore;
using GrandWall.Application.Abstractions.CustomerAccounts;
using GrandWall.Application.Abstractions.Identity;
using GrandWall.Application.Common.Exceptions;
using GrandWall.Application.Features.CustomerAccounts.Dtos;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Persistence;

namespace GrandWall.Infrastructure.Services;

public sealed partial class CustomerAccountService(AppDbContext db, ICurrentUserService user, TimeProvider clock) : ICustomerAccountService
{
    private DateOnly Today => DateOnly.FromDateTime(clock.GetUtcNow().ToOffset(TimeSpan.FromHours(4)).DateTime);
    private void Allow(params string[] roles)
    {
        if (!roles.Contains(user.Role.ToString())) throw new ForbiddenException("Bu əməliyyat üçün icazəniz yoxdur.");
    }
    private static LedgerBalance Balance(IEnumerable<CustomerAccountEntry> entries, DateOnly date)
        => AccountLedger.Calculate(entries.Select(e => new LedgerItem(e.EntryType, e.Amount, e.BusinessDate)), date);
    private static CustomerAccountEntryDto Map(CustomerAccountEntry e) => new()
    {
        IsFinalized=e.IsFinalized, Id=e.Id, CustomerId=e.CustomerId, EntryType=e.EntryType, Amount=e.Amount, BusinessDate=e.BusinessDate,
        Note=e.Note, PaymentMethod=e.PaymentMethod, RecordedByUserId=e.RecordedByUserId,
        RecordedByFullName=e.RecordedByFullName, RecordedByRole=e.RecordedByRole, CreatedAtUtc=e.CreatedAtUtc
    };
    private static CustomerAccountSummaryDto Summary(Customer c, List<CustomerAccountEntry> entries, DateOnly date)
    {
        var b = Balance(entries, date);
        var before = Balance(entries, date.AddDays(-1));
        var debt = entries.Where(e => e.BusinessDate == date && e.EntryType is CustomerAccountEntryType.Debt or CustomerAccountEntryType.DailyIncrease).Sum(e => e.Amount)
            - entries.Where(e => e.BusinessDate == date && e.EntryType == CustomerAccountEntryType.DailyDecrease).Sum(e => e.Amount);
        var paid = entries.Where(e => e.BusinessDate == date && e.EntryType == CustomerAccountEntryType.Payment).Sum(e => e.Amount);
        return new() { CustomerId=c.Id, CustomerName=c.Name, PhoneNumber=c.PhoneNumber, IsActive=c.IsActive,
            BusinessDate=date, PreviousDebt=before.Total, TodayDebt=debt, TodayPayment=paid,
            PaidFromTodayDebt=Math.Min(paid, debt), PaidFromPreviousDebt=Math.Max(0,paid-debt),
            PreviousDebtRemaining=b.Old, TodayDebtRemaining=b.Today, CarriedDailyDebt=b.Carried,
            HasUnpaidDailyDebt=b.Carried>0, RemainingDebt=b.Total };
    }
    public async Task<CustomerAccountListDto> GetAllAsync(CustomerAccountListQueryDto query, CancellationToken cancellationToken=default)
    {
        Allow("Admin","Accountant","Driver");
        var date=query.Date ?? Today;
        var customers=await db.Customers.AsNoTracking().Where(c => query.Search == null || c.Name.Contains(query.Search)).ToListAsync(cancellationToken);
        var deletedIds=customers.Where(c=>c.IsDeleted).Select(c=>c.Id).ToHashSet();
        var ids=customers.Select(c=>c.Id).ToList();
        var entries=await db.CustomerAccountEntries.AsNoTracking().Where(e=>ids.Contains(e.CustomerId) && e.BusinessDate<=date).ToListAsync(cancellationToken);
        var summaries=customers.Select(c=>Summary(c,entries.Where(e=>e.CustomerId==c.Id).ToList(),date))
            .Where(c=>!deletedIds.Contains(c.CustomerId) || c.RemainingDebt>0).OrderByDescending(c=>c.HasUnpaidDailyDebt).ThenBy(c=>c.CustomerName).ToList();
        return new() { Items=summaries.Skip((query.PageNumber-1)*query.PageSize).Take(query.PageSize).ToList(),
            BusinessDate=date, TotalCount=summaries.Count, PageNumber=query.PageNumber, PageSize=query.PageSize };
    }
    public async Task<CustomerAccountDetailsDto> GetByCustomerIdAsync(Guid customerId,CancellationToken cancellationToken=default)
    {
        Allow("Admin","Accountant","Driver");
        var c=await db.Customers.AsNoTracking().FirstOrDefaultAsync(c=>c.Id==customerId,cancellationToken)
            ?? throw new NotFoundException("Müştəri tapılmadı.");
        var entries=await db.CustomerAccountEntries.AsNoTracking().Where(e=>e.CustomerId==customerId).OrderBy(e=>e.BusinessDate).ThenBy(e=>e.CreatedAtUtc).ToListAsync(cancellationToken);
        var b=Balance(entries,Today);
        var days=entries.GroupBy(e=>e.BusinessDate).OrderByDescending(g=>g.Key).Select(g=> {
            var prior=entries.Where(e=>e.BusinessDate<g.Key).ToList();
            var opening=Balance(prior,g.Key);
            var yesterday=Balance(prior,g.Key.AddDays(-1));
            var closing=Balance(entries,g.Key);
            var initial=g.Where(e=>e.EntryType==CustomerAccountEntryType.OpeningBalance).Sum(e=>e.Amount);
            var added=g.Where(e=>e.EntryType is CustomerAccountEntryType.Debt or CustomerAccountEntryType.DailyIncrease).Sum(e=>e.Amount)-g.Where(e=>e.EntryType==CustomerAccountEntryType.DailyDecrease).Sum(e=>e.Amount);
            var paid=g.Where(e=>e.EntryType==CustomerAccountEntryType.Payment).Sum(e=>e.Amount);
            return new CustomerAccountDayDto {
                OpeningOldDebt=opening.Old+initial, OpeningCarriedDailyDebt=opening.Carried,
                PaidFromCarriedDailyDebt=Math.Min(opening.Carried,Math.Max(0,paid-added)),
                CarriedDailyTransferredToOld=Math.Max(0,yesterday.Carried+yesterday.Today-opening.Carried),
                OldDebtRemaining=closing.Old, CarriedDailyDebt=closing.Carried, TodayDebtRemaining=closing.Today,
                BusinessDate=g.Key, OpeningDebt=opening.Total+initial, AddedDebt=added,
                AdjustmentAmount=g.Where(e=>e.EntryType==CustomerAccountEntryType.AdjustmentIncrease).Sum(e=>e.Amount)-g.Where(e=>e.EntryType==CustomerAccountEntryType.AdjustmentDecrease).Sum(e=>e.Amount),
                PaidAmount=paid, ClosingDebt=closing.Total,
                Entries=g.OrderByDescending(e=>e.CreatedAtUtc).Select(Map).ToList()
            };
        }).ToList();
        var paid=entries.Where(e=>e.EntryType==CustomerAccountEntryType.Payment).Sum(e=>e.Amount);
        return new() { CustomerId=c.Id, CustomerName=c.Name, PhoneNumber=c.PhoneNumber, IsActive=c.IsActive,
            PreviousDebt=b.Old, OldDebtRemaining=b.Old, CarriedDailyDebt=b.Carried, TodayDebtRemaining=b.Today,
            Audit=(await db.AccountEntryAudits.AsNoTracking().Where(a=>a.CustomerId==customerId).OrderByDescending(a=>a.CreatedAtUtc).ToListAsync(cancellationToken)).Select(a=>new AccountAuditDto(a.EntryId,a.UserName,a.Description,a.CreatedAtUtc)).ToList(),
            RemainingDebt=b.Total, TotalPaid=paid, TotalDebt=b.Total+paid, TotalNewDebt=days.Sum(d=>d.AddedDebt), Days=days };
    }
    private CustomerAccountEntry Entry(Guid id,CustomerAccountEntryType type,decimal amount,string? note,string? method=null) => new() {
        CustomerId=id,EntryType=type,Amount=amount,BusinessDate=Today,Note=note,PaymentMethod=method,
        RecordedByUserId=user.UserId,RecordedByFullName=user.FullName,RecordedByRole=user.Role };
    private static void Money(decimal amount)
    {
        if(amount<0 || amount>9999999999999999.99m || decimal.Round(amount,2)!=amount)
            throw new ConflictException("Məbləğ mənfi ola bilməz və ən çox iki qəpik rəqəmi olmalıdır.");
    }
    private async Task Mutate(Guid id,Func<List<CustomerAccountEntry>,Task> action,CancellationToken ct)
    {
        await db.Database.CreateExecutionStrategy().ExecuteAsync(async()=> {
            db.ChangeTracker.Clear();
            await using var tx=await db.Database.BeginTransactionAsync(IsolationLevel.Serializable,ct);
            var customer=await db.Customers.FirstOrDefaultAsync(c=>c.Id==id,ct) ?? throw new NotFoundException("Müştəri tapılmadı.");
            var entries=await db.CustomerAccountEntries.Where(e=>e.CustomerId==id).ToListAsync(ct);
            await action(entries);
            await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        });
    }
    public async Task<CustomerAccountDetailsDto> CreateTodayAsync(CreateCustomerAccountRequestDto r,CancellationToken cancellationToken=default)
    {
        Allow("Admin","Accountant","Driver");
        Money(r.TodayDebt); Money(r.InitialPreviousDebt??0);
        if(r.TodayDebt<=0 && r.InitialPreviousDebt.GetValueOrDefault()<=0) throw new ConflictException("Borc məbləğini yazın.");
        await Mutate(r.CustomerId,async entries=> {
            if(!await db.Customers.AnyAsync(c=>c.Id==r.CustomerId && c.IsActive,cancellationToken)) throw new ConflictException("Müştəri deaktivdir.");
            if(r.InitialPreviousDebt>0) db.Add(Entry(r.CustomerId,CustomerAccountEntryType.OpeningBalance,r.InitialPreviousDebt.Value,r.Note));
            if(r.TodayDebt>0) db.Add(Entry(r.CustomerId,CustomerAccountEntryType.Debt,r.TodayDebt,r.Note));
        },cancellationToken);
        return await GetByCustomerIdAsync(r.CustomerId,cancellationToken);
    }
    public async Task<CustomerAccountDetailsDto> RecordPaymentAsync(RecordCustomerPaymentRequestDto r,CancellationToken cancellationToken=default)
    {
        Allow("Admin","Accountant","Driver"); Money(r.Amount);
        if(r.Amount<=0 || r.PaymentMethod is not ("cash" or "card")) throw new ConflictException("Məbləği və nağd/kart seçimini yoxlayın.");
        await Mutate(r.CustomerId,entries=> {
            if(r.Amount>Balance(entries,Today).Total) throw new ConflictException("Ödəniş qalıq borcdan çox ola bilməz.");
            db.Add(Entry(r.CustomerId,CustomerAccountEntryType.Payment,r.Amount,r.Note,r.PaymentMethod)); return Task.CompletedTask;
        },cancellationToken);
        return await GetByCustomerIdAsync(r.CustomerId,cancellationToken);
    }
    public async Task<CustomerAccountDetailsDto> CorrectPreviousDebtAsync(CorrectPreviousDebtRequestDto r,CancellationToken cancellationToken=default)
    {
        Allow("Admin"); Money(r.CorrectedPreviousDebt);
        await Correct(r.CustomerId,r.CorrectedPreviousDebt,r.Reason,false,Today,cancellationToken);
        return await GetByCustomerIdAsync(r.CustomerId,cancellationToken);
    }
    public async Task<CustomerAccountDetailsDto> CorrectDailyAsync(CorrectDailyDebtRequestDto r,CancellationToken cancellationToken=default)
    {
        Allow("Admin","Accountant","Driver"); Money(r.Amount);
        await Correct(r.CustomerId,r.Amount,r.Reason,true,r.Date??Today,cancellationToken);
        return await GetByCustomerIdAsync(r.CustomerId,cancellationToken);
    }
    private async Task Correct(Guid id,decimal amount,string reason,bool daily,DateOnly date,CancellationToken ct)
    {
        if(string.IsNullOrWhiteSpace(reason)||reason.Trim().Length<3||reason.Length>400) throw new ConflictException("Düzəliş səbəbi 3–400 simvol olmalıdır.");
        await Mutate(id,entries=> {
            if(date>Today || (date!=Today && user.Role!=UserRole.Admin)) throw new ForbiddenException("Keçmiş günlük borcu yalnız admin düzəldə bilər.");
            var dailyEntries=entries.Where(e=>e.BusinessDate==date && e.EntryType is CustomerAccountEntryType.Debt or CustomerAccountEntryType.DailyIncrease or CustomerAccountEntryType.DailyDecrease).ToList();
            if(daily && user.Role!=UserRole.Admin && !dailyEntries.Any(e=>!e.IsFinalized && e.EntryType==CustomerAccountEntryType.Debt)) throw new ForbiddenException("Bitirilmiş günlük borcu yalnız admin düzəldə bilər. Yeni borc əlavə edə bilərsiniz.");
            if(daily && user.Role!=UserRole.Admin) dailyEntries=dailyEntries.Where(e=>!e.IsFinalized).ToList();
            var b=Balance(entries,date);
            var current=daily ? dailyEntries.Where(e=>e.EntryType!=CustomerAccountEntryType.DailyDecrease).Sum(e=>e.Amount)-dailyEntries.Where(e=>e.EntryType==CustomerAccountEntryType.DailyDecrease).Sum(e=>e.Amount) : b.Old;
            if(daily && !dailyEntries.Any(e=>e.EntryType==CustomerAccountEntryType.Debt)) throw new ConflictException("Əvvəlcə günlük borcu yaradın.");
            var delta=amount-current;
            if(delta==0) throw new ConflictException("Məbləğ dəyişməyib.");
            // Already allocated payments cannot be silently moved by a correction.
            if(daily && delta<0 && -delta>b.Today) throw new ConflictException("Yeni günlük məbləğ artıq ödənilmiş məbləğdən az ola bilməz.");
            var type=daily ? (delta>0?CustomerAccountEntryType.DailyIncrease:CustomerAccountEntryType.DailyDecrease)
                : (delta>0?CustomerAccountEntryType.AdjustmentIncrease:CustomerAccountEntryType.AdjustmentDecrease);
            var adjustment=Entry(id,type,Math.Abs(delta),$"{(daily?"Günlük":"Köhnə")} borc: {current:0.00} → {amount:0.00} AZN. Səbəb: {reason.Trim()}");
            adjustment.BusinessDate=date; adjustment.IsFinalized=date<Today || dailyEntries.Any(e=>e.IsFinalized);
            entries.Add(adjustment); EnsureValidBalances(entries); db.Add(adjustment);
            return Task.CompletedTask;
        },ct);
    }
    public async Task<IReadOnlyList<AccountReportHistoryDto>> GetReportHistoryAsync(CancellationToken cancellationToken=default)
    {
        Allow("Admin","Accountant","Driver");
        var entries=await db.CustomerAccountEntries.AsNoTracking().Select(e=>new {e.BusinessDate,e.EntryType,e.Amount,e.IsFinalized}).ToListAsync(cancellationToken);
        var closed=await db.AccountDayClosures.AsNoTracking().Select(c=>c.BusinessDate).ToListAsync(cancellationToken);
        return entries.Select(e=>e.BusinessDate).Concat(closed).Distinct().OrderByDescending(d=>d).Select(d=>new AccountReportHistoryDto(d,entries.Where(e=>e.BusinessDate==d && e.EntryType==CustomerAccountEntryType.Payment).Sum(e=>e.Amount),closed.Contains(d) && !entries.Any(e=>e.BusinessDate==d && !e.IsFinalized))).ToList();
    }
    public async Task<AccountDayReportDto> GetReportAsync(DateOnly date,CancellationToken cancellationToken=default)
    {
        Allow("Admin","Accountant","Driver");
        var customers=await db.Customers.AsNoTracking().ToListAsync(cancellationToken);
        var entries=await db.CustomerAccountEntries.AsNoTracking().Where(e=>e.BusinessDate<=date).ToListAsync(cancellationToken);
        var payments=entries.Where(e=>e.BusinessDate==date && e.EntryType==CustomerAccountEntryType.Payment).ToList();
        var closure=await db.AccountDayClosures.AsNoTracking().FirstOrDefaultAsync(x=>x.BusinessDate==date,cancellationToken);
        return new() { BusinessDate=date, HasOpenEntries=entries.Any(e=>e.BusinessDate==date && !e.IsFinalized), Cash=payments.Where(e=>e.PaymentMethod=="cash").Sum(e=>e.Amount), Card=payments.Where(e=>e.PaymentMethod=="card").Sum(e=>e.Amount),
            Unspecified=payments.Where(e=>e.PaymentMethod==null).Sum(e=>e.Amount), Closure=closure==null?null:new(closure.RecordedByFullName,closure.ClosedAtUtc),
            Customers=customers.Select(c=>Summary(c,entries.Where(e=>e.CustomerId==c.Id).ToList(),date)).Where(c=>c.TodayDebt>0||c.TodayPayment>0||c.CarriedDailyDebt>0).OrderBy(c=>c.CustomerName).ToList() };
    }
    public async Task<AccountDayReportDto> CloseDayAsync(CancellationToken cancellationToken=default)
    {
        Allow("Admin","Accountant","Driver");
        await db.Database.CreateExecutionStrategy().ExecuteAsync(async()=> {
            db.ChangeTracker.Clear();
            await using var tx=await db.Database.BeginTransactionAsync(IsolationLevel.Serializable,cancellationToken);
            var open=await db.CustomerAccountEntries.Where(e=>e.BusinessDate==Today && !e.IsFinalized).ToListAsync(cancellationToken);
            foreach(var entry in open) entry.IsFinalized=true;
            var closure=await db.AccountDayClosures.FirstOrDefaultAsync(x=>x.BusinessDate==Today,cancellationToken);
            if(closure==null){closure=new AccountDayClosure{BusinessDate=Today};db.Add(closure);}
            closure.RecordedByUserId=user.UserId;closure.RecordedByFullName=user.FullName;closure.ClosedAtUtc=clock.GetUtcNow().UtcDateTime;
            await db.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);
        });
        return await GetReportAsync(Today,cancellationToken);
    }
}
