// ==========================================================================
// GrandWall - AÃ§ot (Borc) Modulu - Servis QatÄ±
// TODO: AppDbContext -> Ã¶z DbContext class adÄ±nla É™vÉ™z et.
// TODO: bÃ¼tÃ¼n metodlarÄ± Ã¶z UnitOfWork/Repository pattern-inÉ™ uyÄŸunlaÅŸdÄ±r.
// ==========================================================================

using GrandWall.Domain;
using Microsoft.EntityFrameworkCore;

namespace GrandWall.Services;

public interface IDebtService
{
    Task<DailyDebt> CreateDailyDebtAsync(Guid customerId, decimal amount, Guid createdByUserId);
    Task<DailyDebt> EditDailyDebtAsync(Guid dailyDebtId, decimal newAmount, Guid editedByUserId);
    Task<DebtPayment> ApplyPaymentAsync(Guid customerId, decimal amount, Guid receivedByUserId);
    Task<List<PendingDebtRowDto>> GetPendingDebtListAsync();
    Task<List<DebtHistoryItemDto>> GetCustomerHistoryAsync(Guid customerId);
}

public class DebtService : IDebtService
{
    private readonly AppDbContext _db;               // TODO: Ã¶z DbContext-in
    private readonly IDebtSettingsProvider _settings; // aÅŸaÄŸÄ±da tÉ™rifi var

    public DebtService(AppDbContext db, IDebtSettingsProvider settings)
    {
        _db = db;
        _settings = settings;
    }

    // ---------------------------------------------------------------
    // 1) GÃ¼ndÉ™lik borc yaratmaq ("AÃ§ot yazan" rolu)
    // ---------------------------------------------------------------
    public async Task<DailyDebt> CreateDailyDebtAsync(Guid customerId, decimal amount, Guid createdByUserId)
    {
        if (amount <= 0)
            throw new ArgumentException("Borc mÉ™blÉ™ÄŸi sÄ±fÄ±rdan bÃ¶yÃ¼k olmalÄ±dÄ±r.");

        var debt = new DailyDebt
        {
            CustomerId = customerId,
            DebtDate = DateOnly.FromDateTime(DateTime.UtcNow), // TODO: yerli saat qurÅŸaÄŸÄ±na Ã§evir
            Amount = amount,
            OriginalAmount = amount,
            CreatedByUserId = createdByUserId,
        };

        _db.Set<DailyDebt>().Add(debt);
        await _db.SaveChangesAsync();
        return debt;
    }

    // ---------------------------------------------------------------
    // 2) GÃ¼ndÉ™lik borcu dÃ¼zÉ™ltmÉ™k - SÆBÆB MÆCBURÄ° DEYÄ°L, avtomatik loglanÄ±r
    // ---------------------------------------------------------------
    public async Task<DailyDebt> EditDailyDebtAsync(Guid dailyDebtId, decimal newAmount, Guid editedByUserId)
    {
        var debt = await _db.Set<DailyDebt>().FindAsync(dailyDebtId)
            ?? throw new InvalidOperationException("Borc qeydi tapÄ±lmadÄ±.");

        if (debt.Status is DebtStatus.RolledOver)
            throw new InvalidOperationException("KÃ¶hnÉ™ borca keÃ§miÅŸ qeyd artÄ±q redaktÉ™ edilÉ™ bilmÉ™z.");

        debt.Amount = newAmount;
        debt.LastEditedByUserId = editedByUserId;
        debt.LastEditedAt = DateTimeOffset.UtcNow;
        debt.Status = debt.RemainingAmount <= 0 ? DebtStatus.Paid
                     : debt.PaidAmount > 0 ? DebtStatus.PartiallyPaid
                     : DebtStatus.Pending;

        await _db.SaveChangesAsync();
        return debt;
    }

    // ---------------------------------------------------------------
    // 3) Ã–dÉ™niÅŸ qÉ™bul etmÉ™k ("AÃ§ot qÉ™bul edÉ™n" rolu)
    //    Qayda: É™vvÉ™l aktiv GÃœNDÆLÄ°K borclara (É™n kÃ¶hnÉ™dÉ™n baÅŸlayaraq),
    //    qalan pul varsa KÃ–HNÆ borca yazÄ±lÄ±r.
    //    NÃ¼munÉ™: 200 gÃ¼ndÉ™lik + 100 kÃ¶hnÉ™, mÃ¼ÅŸtÉ™ri 250 verir ->
    //            200 gÃ¼ndÉ™likdÉ™n silinir, 50 kÃ¶hnÉ™dÉ™n silinir.
    // ---------------------------------------------------------------
    public async Task<DebtPayment> ApplyPaymentAsync(Guid customerId, decimal amount, Guid receivedByUserId)
    {
        if (amount <= 0)
            throw new ArgumentException("Ã–dÉ™niÅŸ mÉ™blÉ™ÄŸi sÄ±fÄ±rdan bÃ¶yÃ¼k olmalÄ±dÄ±r.");

        await using var tx = await _db.Database.BeginTransactionAsync();

        var payment = new DebtPayment
        {
            CustomerId = customerId,
            Amount = amount,
            ReceivedByUserId = receivedByUserId,
        };

        var remaining = amount;

        // Aktiv (RolledOver vÉ™ Paid olmayan) gÃ¼ndÉ™lik borclar, É™n kÃ¶hnÉ™dÉ™n baÅŸlayaraq
        var activeDebts = await _db.Set<DailyDebt>()
            .Where(d => d.CustomerId == customerId
                     && d.Status != DebtStatus.Paid
                     && d.Status != DebtStatus.RolledOver)
            .OrderBy(d => d.DebtDate)
            .ToListAsync();

        foreach (var debt in activeDebts)
        {
            if (remaining <= 0) break;
            var applied = Math.Min(remaining, debt.RemainingAmount);
            if (applied <= 0) continue;

            debt.PaidAmount += applied;
            debt.Status = debt.RemainingAmount <= 0 ? DebtStatus.Paid : DebtStatus.PartiallyPaid;
            remaining -= applied;

            payment.Allocations.Add(new DebtPaymentAllocation
            {
                DebtPaymentId = payment.Id,
                DailyDebtId = debt.Id,
                AmountApplied = applied
            });
        }

        // Qalan pul -> kÃ¶hnÉ™ borcdan Ã§Ä±x
        if (remaining > 0)
        {
            var account = await _db.Set<CustomerDebtAccount>().FindAsync(customerId)
                ?? new CustomerDebtAccount { CustomerId = customerId };

            var appliedToOld = Math.Min(remaining, account.OldDebtBalance);
            account.OldDebtBalance -= appliedToOld;
            remaining -= appliedToOld;

            if (appliedToOld > 0)
            {
                payment.Allocations.Add(new DebtPaymentAllocation
                {
                    DebtPaymentId = payment.Id,
                    DailyDebtId = null, // null = kÃ¶hnÉ™ borc
                    AmountApplied = appliedToOld
                });
            }

            // Borcdan artÄ±q Ã¶dÉ™niÅŸ ediblÉ™rsÉ™ -> avans kimi saxla (gÉ™lÉ™cÉ™k borca hesablanacaq)
            if (remaining > 0)
                account.CreditBalance += remaining;

            _db.Update(account);
        }

        _db.Set<DebtPayment>().Add(payment);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return payment;
    }

    // ---------------------------------------------------------------
    // 4) "AÃ§ot TÉ™xir" siyahÄ±sÄ± - É™n Ã§ox gecikÉ™n É™n Ã¼stdÉ™
    // ---------------------------------------------------------------
    public async Task<List<PendingDebtRowDto>> GetPendingDebtListAsync()
    {
        var settings = await _settings.GetAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var rows = await _db.Set<DailyDebt>()
            .Where(d => d.Status != DebtStatus.Paid && d.Status != DebtStatus.RolledOver)
            .GroupBy(d => d.CustomerId)
            .Select(g => new
            {
                CustomerId = g.Key,
                TodayDebtRemaining = g.Sum(x => x.Amount - x.PaidAmount),
                OldestDebtDate = g.Min(x => x.DebtDate),
            })
            .ToListAsync();

        var result = new List<PendingDebtRowDto>();
        foreach (var r in rows)
        {
            var daysOverdue = today.DayNumber - r.OldestDebtDate.DayNumber;
            var account = await _db.Set<CustomerDebtAccount>().FindAsync(r.CustomerId);
            // TODO: customer.Name -> Ã¶z Customer entity-ndÉ™n Ã§É™k
            result.Add(new PendingDebtRowDto(
                CustomerId: r.CustomerId,
                CustomerName: "TODO: Customer.Name",
                TodayDebtRemaining: r.TodayDebtRemaining,
                OldDebtBalance: account?.OldDebtBalance ?? 0,
                DaysOverdue: daysOverdue,
                IsNearRollover: daysOverdue >= settings.RolloverAfterDays - settings.WarningBeforeDays
            ));
        }

        // É™n Ã§ox gecikÉ™n É™n Ã¼stdÉ™
        return result.OrderByDescending(x => x.DaysOverdue).ToList();
    }

    // ---------------------------------------------------------------
    // 5) TarixÃ§É™ - "gÃ¼ndÉ™lik borc bu qÉ™dÉ™r olub, bu qÉ™dÉ™r Ã¶dÉ™nilib"
    // ---------------------------------------------------------------
    public async Task<List<DebtHistoryItemDto>> GetCustomerHistoryAsync(Guid customerId)
    {
        var debts = await _db.Set<DailyDebt>()
            .Where(d => d.CustomerId == customerId)
            .OrderByDescending(d => d.DebtDate)
            .Select(d => new DebtHistoryItemDto(
                Date: d.DebtDate,
                DebtAmount: d.Amount,
                PaidAmount: d.PaidAmount,
                Status: d.Status.ToString(),
                CreatedByUserId: d.CreatedByUserId,
                CreatedAt: d.CreatedAt,
                LastEditedByUserId: d.LastEditedByUserId,
                LastEditedAt: d.LastEditedAt
            ))
            .ToListAsync();

        return debts;
    }
}

public record PendingDebtRowDto(
    Guid CustomerId,
    string CustomerName,
    decimal TodayDebtRemaining,
    decimal OldDebtBalance,
    int DaysOverdue,
    bool IsNearRollover
);

public record DebtHistoryItemDto(
    DateOnly Date,
    decimal DebtAmount,
    decimal PaidAmount,
    string Status,
    Guid CreatedByUserId,
    DateTimeOffset CreatedAt,
    Guid? LastEditedByUserId,
    DateTimeOffset? LastEditedAt
);

public interface IDebtSettingsProvider
{
    Task<DebtSettings> GetAsync();
}
