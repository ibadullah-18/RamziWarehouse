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
    private void ApplyReturnCredit(ProductReturn record, decimal amount)
        => ReturnCreditPosting.Apply(_dbContext, record, amount, _currentUserService, _timeProvider);
}
