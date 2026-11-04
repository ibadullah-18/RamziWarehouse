using Microsoft.EntityFrameworkCore;
using GrandWall.Application.Common.Exceptions;
using GrandWall.Application.Features.CustomerAccounts.Dtos;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;

namespace GrandWall.Infrastructure.Services;

public sealed partial class CustomerAccountService
{
    /// <summary>
    /// Gives money back to a customer we owe (returns worth more than their debt). It can not
    /// exceed what we owe, and it is subtracted from the day's collected cash or card.
    /// Repeating the same operation id changes nothing.
    /// </summary>
    public async Task<CustomerAccountDetailsDto> PayOutAsync(PayoutRequestDto r, CancellationToken cancellationToken = default)
    {
        Allow(AccountRoles);
        Money(r.Cash);
        Money(r.Card);
        if (r.OperationId == Guid.Empty) throw new ConflictException("Əməliyyat identifikatoru düzgün deyil.");
        if (r.Cash + r.Card <= 0) throw new ConflictException("Müştəriyə veriləcək məbləği yazın.");
        if (r.Note?.Length > 400) throw new ConflictException("Qeyd 400 simvoldan çox ola bilməz.");
        var note = string.IsNullOrWhiteSpace(r.Note) ? "Müştəriyə ödəniş" : r.Note.Trim();

        await Mutate(r.CustomerId, async (_, entries) =>
        {
            if (entries.Any(e => e.SettlementId == r.OperationId)) return;
            var owed = AccountLedger.Closing(Items(entries), Today).Advance;
            if (r.Cash + r.Card > owed)
                throw new ConflictException($"Müştəriyə borcumuz {owed:0.00} AZN-dir; ondan çox vermək olmaz.");

            void Add(decimal amount, string method)
            {
                if (amount <= 0) return;
                var entry = NewEntry(r.CustomerId, CustomerAccountEntryType.Payout, amount, Today, note, method);
                entry.SettlementId = r.OperationId;
                db.Add(entry);
                entries.Add(entry);
            }

            Add(r.Cash, "cash");
            Add(r.Card, "card");
            EnsureValidBalances(entries);
            await TouchTodayAsync(cancellationToken);
        }, cancellationToken);
        return await GetByCustomerIdAsync(r.CustomerId, cancellationToken);
    }

    /// <summary>
    /// "Bu günkü əməliyyatları sıfırla": removes every entry written for this customer today
    /// (debts, payments, returns, bonus, corrections) as if nothing had happened today. Returns
    /// credited today become unused again. The reset itself stays in the audit.
    /// </summary>
    public async Task<CustomerAccountDetailsDto> ResetTodayAsync(Guid customerId, AccountResetRequestDto request, CancellationToken cancellationToken = default)
    {
        Allow(UserRole.Admin, UserRole.Accountant);
        EnsureReason(request.Reason);
        await Mutate(customerId, async (customer, entries) =>
        {
            var today = entries.Where(e => e.BusinessDate == Today).ToList();
            if (today.Count == 0) throw new ConflictException("Bu gün bu müştəri üçün heç bir əməliyyat yazılmayıb.");
            await RemoveEntriesAsync(customerId, today, cancellationToken);
            var settlements = await db.AccountSettlements.Where(s => s.CustomerId == customerId && s.BusinessDate == Today).ToListAsync(cancellationToken);
            db.AccountSettlements.RemoveRange(settlements);
            Audit(customerId, $"Bu günün bütün əməliyyatları silindi ({today.Count} qeyd). Səbəb: {request.Reason.Trim()}");
        }, cancellationToken);
        return await GetByCustomerIdAsync(customerId, cancellationToken);
    }

    /// <summary>
    /// "Bütün hesabı sıfırla": removes the whole account history of the customer, so the debt,
    /// the payments and the credit all become zero, as for a new customer. Admin only.
    /// </summary>
    public async Task<CustomerAccountDetailsDto> WipeAccountAsync(Guid customerId, AccountResetRequestDto request, CancellationToken cancellationToken = default)
    {
        Allow(UserRole.Admin);
        EnsureReason(request.Reason);
        await Mutate(customerId, async (customer, entries) =>
        {
            if (entries.Count == 0) throw new ConflictException("Bu müştərinin hesabında qeyd yoxdur.");
            var balance = AccountLedger.Closing(Items(entries), Today);
            await RemoveEntriesAsync(customerId, entries, cancellationToken, keepReturnsSettled: true);
            var settlements = await db.AccountSettlements.Where(s => s.CustomerId == customerId).ToListAsync(cancellationToken);
            db.AccountSettlements.RemoveRange(settlements);
            Audit(customerId, $"Bütün hesab sıfırlandı ({entries.Count} qeyd; borc {balance.Total:0.00}, bizim borcumuz {balance.Advance:0.00} AZN idi). Səbəb: {request.Reason.Trim()}");
        }, cancellationToken);
        return await GetByCustomerIdAsync(customerId, cancellationToken);
    }

    /// <summary>
    /// Deletes the entries. Returns whose credit is removed become unused again, unless the
    /// whole account is wiped: then they are treated as settled so they are not credited twice.
    /// </summary>
    private async Task RemoveEntriesAsync(Guid customerId, IReadOnlyCollection<CustomerAccountEntry> removed, CancellationToken ct, bool keepReturnsSettled = false)
    {
        var credited = removed
            .Where(e => e.SourceReturnId.HasValue && e.EntryType is CustomerAccountEntryType.ReturnCredit or CustomerAccountEntryType.CreditReversal)
            .GroupBy(e => e.SourceReturnId!.Value)
            .ToDictionary(g => g.Key, g => g.Sum(e => e.EntryType == CustomerAccountEntryType.ReturnCredit ? e.Amount : -e.Amount));
        if (credited.Count > 0 && !keepReturnsSettled)
        {
            var ids = credited.Keys.ToList();
            var returns = await db.ProductReturns.Where(x => ids.Contains(x.Id)).ToListAsync(ct);
            foreach (var record in returns)
            {
                record.AppliedAmount = Math.Max(0, record.AppliedAmount - credited[record.Id]);
                record.Revision = Guid.NewGuid();
            }
        }
        db.CustomerAccountEntries.RemoveRange(removed);
    }

    private void Audit(Guid customerId, string description)
        => db.AccountEntryAudits.Add(new AccountEntryAudit
        {
            CustomerId = customerId, EntryId = Guid.Empty, UserId = user.UserId, UserName = user.FullName, Description = description
        });
}
