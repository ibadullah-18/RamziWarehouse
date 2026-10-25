using System.Globalization;
using Microsoft.EntityFrameworkCore;
using GrandWall.Application.Common.Exceptions;
using GrandWall.Application.Features.CustomerAccounts.Dtos;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;

namespace GrandWall.Infrastructure.Services;

public sealed partial class CustomerAccountService
{
    private static string ReturnsKey(IEnumerable<SettlementReturnDto> returns)
        => string.Join(';', returns.OrderBy(r => r.ReturnId)
            .Select(r => $"{r.ReturnId:N}:{r.Amount.ToString("0.00", CultureInfo.InvariantCulture)}"));

    /// <summary>
    /// "Bu müştəri ilə açotu bitir": records what was received (cash and/or card), applies the
    /// bonus and the chosen returns to the debt on the spot, and decides what happens to the
    /// unpaid daily debt. Repeating the same <c>OperationId</c> changes nothing.
    /// </summary>
    public async Task<CustomerAccountDetailsDto> CompleteSettlementAsync(CompleteSettlementRequest r, CancellationToken cancellationToken = default)
    {
        Allow(AccountRoles);
        Money(r.Cash);
        Money(r.Card);
        Money(r.Bonus);
        foreach (var item in r.Returns) Money(item.Amount);
        if (r.OperationId == Guid.Empty) throw new ConflictException("Əməliyyat identifikatoru düzgün deyil.");
        if (r.Note?.Length > 400) throw new ConflictException("Qeyd 400 simvoldan çox ola bilməz.");

        var note = string.IsNullOrWhiteSpace(r.Note) ? null : r.Note.Trim();
        var key = r.Returns.Count == 0 ? null : ReturnsKey(r.Returns);

        await Mutate(r.CustomerId, async (customer, entries) =>
        {
            var existing = await db.AccountSettlements.AsNoTracking().FirstOrDefaultAsync(s => s.Id == r.OperationId, cancellationToken);
            if (existing is not null)
            {
                if (existing.CustomerId != r.CustomerId || existing.Cash != r.Cash || existing.Card != r.Card || existing.Bonus != r.Bonus ||
                    existing.CarryToTomorrow != r.CarryToTomorrow || existing.ReturnsKey != key || existing.Note != note)
                    throw new ConflictException("Əvvəlki əməliyyatın məlumatı dəyişdirilə bilməz. Yeni əməliyyat yaradın.");
                return;
            }

            var today = Today;
            var returnIds = r.Returns.Select(x => x.ReturnId).ToList();
            var returns = returnIds.Count == 0
                ? []
                : await db.ProductReturns.Where(x => returnIds.Contains(x.Id)).ToListAsync(cancellationToken);
            if (returns.Count != returnIds.Count || returns.Any(x => x.CustomerId != r.CustomerId || x.IsDeleted || x.AppliedAmount != 0 || x.Status == ReturnStatus.Cancelled))
                throw new ConflictException("Seçilmiş vazvrat bu müştəriyə aid deyil və ya artıq borca tətbiq olunub.");

            db.AccountSettlements.Add(new AccountSettlement
            {
                Id = r.OperationId, CustomerId = r.CustomerId, BusinessDate = today, Cash = r.Cash, Card = r.Card, Bonus = r.Bonus,
                CarryToTomorrow = r.CarryToTomorrow, ReturnsKey = key, Note = note, RecordedByUserId = user.UserId,
                CreatedAtUtc = DateTime.UtcNow
            });

            void Add(decimal amount, CustomerAccountEntryType type, string? method = null, Guid? returnId = null, string? entryNote = null)
            {
                if (amount <= 0) return;
                var entry = NewEntry(r.CustomerId, type, amount, today, entryNote ?? note, method);
                entry.SettlementId = r.OperationId;
                entry.SourceReturnId = returnId;
                db.Add(entry);
                entries.Add(entry);
            }

            Add(r.Cash, CustomerAccountEntryType.Payment, "cash");
            Add(r.Card, CustomerAccountEntryType.Payment, "card");
            Add(r.Bonus, CustomerAccountEntryType.Bonus);
            foreach (var item in r.Returns)
            {
                var record = returns.Single(x => x.Id == item.ReturnId);
                record.Amount = item.Amount;
                record.AppliedAmount = item.Amount;
                record.Revision = Guid.NewGuid();
                db.ProductReturnStatusHistories.Add(new ProductReturnStatusHistory
                {
                    ProductReturnId = record.Id, PreviousStatus = record.Status, NewStatus = record.Status,
                    ChangedByUserId = user.UserId,
                    Note = $"Açotda borcdan çıxıldı: {item.Amount:0.00} AZN ({customer.Name})"
                });
                Add(item.Amount, CustomerAccountEntryType.ReturnCredit, null, record.Id, $"Vazvrat: {item.Amount:0.00} AZN");
            }

            // The customer stays "−" only while daily debt is left; unless it is kept for
            // tomorrow, the unpaid rest becomes old debt right now.
            var remainingDaily = AccountLedger.Closing(Items(entries), today).Daily;
            if (!r.CarryToTomorrow && remainingDaily > 0)
                Add(remainingDaily, CustomerAccountEntryType.DailyToOld, null, null, "Günlük qalıq köhnə borca keçdi");

            EnsureValidBalances(entries);
            await TouchTodayAsync(cancellationToken);
        }, cancellationToken);

        return await GetByCustomerIdAsync(r.CustomerId, cancellationToken);
    }

    // ---------------------------------------------------------------- corrections

    public async Task<CustomerAccountDetailsDto> CorrectPreviousDebtAsync(CorrectPreviousDebtRequestDto r, CancellationToken cancellationToken = default)
    {
        Allow(UserRole.Admin);
        Money(r.CorrectedPreviousDebt);
        EnsureReason(r.Reason);
        await Mutate(r.CustomerId, async (_, entries) =>
        {
            var current = AccountLedger.Closing(Items(entries), Today).Old;
            var delta = r.CorrectedPreviousDebt - current;
            if (delta == 0) throw new ConflictException("Məbləğ dəyişməyib.");
            var type = delta > 0 ? CustomerAccountEntryType.AdjustmentIncrease : CustomerAccountEntryType.AdjustmentDecrease;
            AddCorrection(r.CustomerId, entries, type, Math.Abs(delta), Today, $"Köhnə borc: {current:0.00} → {r.CorrectedPreviousDebt:0.00} AZN. Səbəb: {r.Reason.Trim()}");
            await TouchTodayAsync(cancellationToken);
        }, cancellationToken);
        return await GetByCustomerIdAsync(r.CustomerId, cancellationToken);
    }

    public async Task<CustomerAccountDetailsDto> CorrectDailyAsync(CorrectDailyDebtRequestDto r, CancellationToken cancellationToken = default)
    {
        Allow(AccountRoles);
        Money(r.Amount);
        EnsureReason(r.Reason);
        var date = r.Date ?? Today;
        if (date > Today) throw new ConflictException("Gələcək tarix üçün düzəliş edilə bilməz.");
        if (date < Today && user.Role != UserRole.Admin)
            throw new ForbiddenException("Bitmiş günü yalnız admin düzəldə bilər.");

        await Mutate(r.CustomerId, async (_, entries) =>
        {
            var day = entries.Where(e => e.BusinessDate == date).ToList();
            if (!day.Any(e => e.EntryType == CustomerAccountEntryType.Debt))
                throw new ConflictException("Bu tarixdə günlük borc yazılmayıb.");
            var current = Sum(day, CustomerAccountEntryType.Debt, CustomerAccountEntryType.DailyIncrease) - Sum(day, CustomerAccountEntryType.DailyDecrease);
            var delta = r.Amount - current;
            if (delta == 0) throw new ConflictException("Məbləğ dəyişməyib.");
            var type = delta > 0 ? CustomerAccountEntryType.DailyIncrease : CustomerAccountEntryType.DailyDecrease;
            AddCorrection(r.CustomerId, entries, type, Math.Abs(delta), date, $"Günlük borc: {current:0.00} → {r.Amount:0.00} AZN. Səbəb: {r.Reason.Trim()}");
            if (date == Today) await TouchTodayAsync(cancellationToken);
        }, cancellationToken);
        return await GetByCustomerIdAsync(r.CustomerId, cancellationToken);
    }

    public async Task<CustomerAccountDetailsDto> CorrectPaymentAsync(CorrectAccountPaymentRequestDto r, CancellationToken cancellationToken = default)
    {
        Allow(AccountRoles);
        Money(r.Amount);
        if (r.Amount <= 0 || r.PaymentMethod is not ("cash" or "card"))
            throw new ConflictException("Məbləği və ödəniş üsulunu yoxlayın.");
        EnsureReason(r.Reason);

        await Mutate(r.CustomerId, async (_, entries) =>
        {
            var entry = entries.SingleOrDefault(e => e.Id == r.EntryId && e.EntryType == CustomerAccountEntryType.Payment)
                ?? throw new NotFoundException("Ödəniş tapılmadı.");
            if (user.Role != UserRole.Admin && entry.BusinessDate != Today)
                throw new ForbiddenException("Keçmiş günün ödənişini yalnız admin düzəldə bilər.");
            if (entry.Amount != r.ExpectedAmount || entry.PaymentMethod != r.ExpectedPaymentMethod)
                throw new ConflictException("Ödəniş dəyişdirilib. Səhifəni yeniləyin.");
            if (entry.Amount == r.Amount && entry.PaymentMethod == r.PaymentMethod)
                throw new ConflictException("Məlumat dəyişməyib.");

            var description = $"Ödəniş: {entry.Amount:0.00} ({entry.PaymentMethod}) → {r.Amount:0.00} ({r.PaymentMethod}). Səbəb: {r.Reason.Trim()}";
            entry.Amount = r.Amount;
            entry.PaymentMethod = r.PaymentMethod;
            EnsureValidBalances(entries);
            db.AccountEntryAudits.Add(new AccountEntryAudit
            {
                CustomerId = r.CustomerId, EntryId = entry.Id, UserId = user.UserId, UserName = user.FullName, Description = description
            });
            await Task.CompletedTask;
        }, cancellationToken);
        return await GetByCustomerIdAsync(r.CustomerId, cancellationToken);
    }

    private void AddCorrection(Guid customerId, List<CustomerAccountEntry> entries, CustomerAccountEntryType type, decimal amount, DateOnly date, string description)
    {
        var entry = NewEntry(customerId, type, amount, date, description);
        entries.Add(entry);
        EnsureValidBalances(entries);
        db.Add(entry);
        db.AccountEntryAudits.Add(new AccountEntryAudit
        {
            CustomerId = customerId, EntryId = entry.Id, UserId = user.UserId, UserName = user.FullName, Description = description
        });
    }

    private static void EnsureReason(string reason)
    {
        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length < 3 || reason.Length > 400)
            throw new ConflictException("Düzəliş səbəbi 3–400 simvol olmalıdır.");
    }
}
