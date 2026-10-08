using GrandWall.Application.Common.Exceptions;
using GrandWall.Application.Features.CustomerAccounts.Dtos;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using Microsoft.EntityFrameworkCore;
namespace GrandWall.Infrastructure.Services;
public sealed partial class CustomerAccountService
{
    public async Task<CustomerAccountDetailsDto> CompleteSettlementAsync(CompleteSettlementRequest r,CancellationToken cancellationToken=default)
    {
        Allow("Admin","Accountant","Driver");Money(r.Cash);Money(r.Card);Money(r.Bonus);
        if(r.OperationId==Guid.Empty||r.Cash+r.Card+r.Bonus<=0&&r.ProductReturnId==null||r.Note?.Length>400)
            throw new ConflictException("Ödəniş və ya əlavə əməliyyat daxil edin.");
        await Mutate(r.CustomerId,async entries=>{
            var existing=await db.AccountSettlements.FindAsync([r.OperationId],cancellationToken);
            if(existing!=null){
                if(existing.CustomerId!=r.CustomerId||existing.Cash!=r.Cash||existing.Card!=r.Card||existing.Bonus!=r.Bonus||existing.ProductReturnId!=r.ProductReturnId||existing.Note!=r.Note)
                    throw new ConflictException("Əvvəlki açotun məlumatı dəyişdirilə bilməz. Yeni əməliyyat yaradın.");
                return;
            }
            if(r.ProductReturnId.HasValue&&!await db.ProductReturns.AnyAsync(x=>x.Id==r.ProductReturnId&&x.CustomerId==r.CustomerId&&!x.IsDeleted&&(x.Status==ReturnStatus.Pending||x.Status==ReturnStatus.Submitted),cancellationToken))
                throw new ConflictException("Bu müştərinin təsdiq gözləyən vazvratını seçin.");
            db.AccountSettlements.Add(new AccountSettlement{Id=r.OperationId,CustomerId=r.CustomerId,BusinessDate=Today,Cash=r.Cash,Card=r.Card,Bonus=r.Bonus,ProductReturnId=r.ProductReturnId,Note=r.Note,RecordedByUserId=user.UserId});
            foreach(var e in entries.Where(e=>e.BusinessDate==Today&&!e.IsFinalized))e.IsFinalized=true;
            void Add(decimal amount,CustomerAccountEntryType type,string? method=null){if(amount<=0)return;var e=Entry(r.CustomerId,type,amount,r.Note,method);e.IsFinalized=true;e.SettlementId=r.OperationId;db.Add(e);}
            Add(r.Cash,CustomerAccountEntryType.Payment,"cash");Add(r.Card,CustomerAccountEntryType.Payment,"card");Add(r.Bonus,CustomerAccountEntryType.Bonus);
        },cancellationToken);
        return await GetByCustomerIdAsync(r.CustomerId,cancellationToken);
    }
}
