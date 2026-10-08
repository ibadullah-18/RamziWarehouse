using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Application.Common.Exceptions;
namespace GrandWall.Infrastructure.Services;
public sealed partial class ProductReturnService
{
    private static void ValidateReturnAmount(decimal amount)
    {
        if(amount<0||amount>9999999999999999.99m||decimal.Round(amount,2)!=amount)
            throw new ConflictException("Vazvrat məbləği düzgün deyil.");
    }
    // Parent revision and the financial entry commit together in SaveChanges.
    // Corrections are posted today rather than rewriting a closed historical day.
    private void ApplyReturnCredit(ProductReturn record, decimal amount)
    {
        var delta=amount-record.AppliedAmount;
        if(delta==0)return;
        _dbContext.CustomerAccountEntries.Add(new CustomerAccountEntry {
            CustomerId=record.CustomerId,Amount=Math.Abs(delta),SourceReturnId=record.Id,
            EntryType=delta>0?CustomerAccountEntryType.ReturnCredit:CustomerAccountEntryType.CreditReversal,
            BusinessDate=DateOnly.FromDateTime(_timeProvider.GetUtcNow().ToOffset(TimeSpan.FromHours(4)).DateTime),
            RecordedByUserId=_currentUserService.UserId,RecordedByFullName=_currentUserService.FullName,
            RecordedByRole=_currentUserService.Role,IsFinalized=true,
            Note=$"Vazvrat {record.Id}: {record.AppliedAmount:0.00} → {amount:0.00} AZN"
        });
        record.AppliedAmount=amount;record.Revision=Guid.NewGuid();
    }
}
