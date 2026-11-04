using GrandWall.Application.Abstractions.Identity;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Persistence;

namespace GrandWall.Infrastructure.Services;

/// <summary>
/// Keeps a return's credit on the customer's account equal to <c>amount</c>. Only the difference
/// is posted, dated today, so a closed day is never rewritten: sending a return to the manager
/// credits it, a later amount change posts the difference, rejection or deletion gives it back.
/// Saved by the caller together with the return itself.
/// </summary>
internal static class ReturnCreditPosting
{
    public static void Apply(AppDbContext db, ProductReturn record, decimal amount, ICurrentUserService user, TimeProvider clock)
    {
        var delta = amount - record.AppliedAmount;
        if (delta == 0) return;
        db.CustomerAccountEntries.Add(new CustomerAccountEntry
        {
            CustomerId = record.CustomerId,
            Amount = Math.Abs(delta),
            SourceReturnId = record.Id,
            EntryType = delta > 0 ? CustomerAccountEntryType.ReturnCredit : CustomerAccountEntryType.CreditReversal,
            BusinessDate = DateOnly.FromDateTime(clock.GetUtcNow().ToOffset(TimeSpan.FromHours(4)).DateTime),
            RecordedByUserId = user.UserId,
            RecordedByFullName = user.FullName,
            RecordedByRole = user.Role,
            Note = delta > 0
                ? $"Vazvrat borcdan çıxıldı: {record.AppliedAmount:0.00} → {amount:0.00} AZN"
                : $"Vazvrat geri alındı: {record.AppliedAmount:0.00} → {amount:0.00} AZN"
        });
        record.AppliedAmount = amount;
        record.Revision = Guid.NewGuid();
    }
}
