using GrandWall.Application.Common.Exceptions;
using GrandWall.Application.Features.CustomerAccounts.Dtos;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
namespace GrandWall.Infrastructure.Services;
public sealed partial class CustomerAccountService
{
    private static void EnsureValidBalances(IEnumerable<CustomerAccountEntry> entries)
    {
        foreach(var date in entries.Select(e=>e.BusinessDate).Distinct())
        { var b=Balance(entries,date); if(b.Old<0 || b.Carried<0 || b.Today<0) throw new ConflictException("Düzəliş borcu mənfiyə salır və ya sonrakı ödənişlərlə uyğun gəlmir."); }
    }
    public async Task<CustomerAccountDetailsDto> CorrectPaymentAsync(CorrectAccountPaymentRequestDto r,CancellationToken cancellationToken=default)
    {
        Allow("Admin","Accountant","Driver");Money(r.Amount);
        if(r.Amount<=0 || r.PaymentMethod is not ("cash" or "card")) throw new ConflictException("Məbləği və ödəniş üsulunu yoxlayın.");
        if(string.IsNullOrWhiteSpace(r.Reason)||r.Reason.Trim().Length<3||r.Reason.Length>400) throw new ConflictException("Düzəliş səbəbi 3–400 simvol olmalıdır.");
        await Mutate(r.CustomerId,entries=>{
            var entry=entries.SingleOrDefault(e=>e.Id==r.EntryId && e.EntryType==CustomerAccountEntryType.Payment) ?? throw new NotFoundException("Ödəniş tapılmadı.");
            if(user.Role!=UserRole.Admin && (entry.IsFinalized || entry.BusinessDate!=Today)) throw new ForbiddenException("Bitirilmiş və keçmiş ödənişi yalnız admin düzəldə bilər.");
            if(entry.Amount!=r.ExpectedAmount || entry.PaymentMethod!=r.ExpectedPaymentMethod) throw new ConflictException("Ödəniş dəyişdirilib. Səhifəni yeniləyin.");
            if(entry.Amount==r.Amount && entry.PaymentMethod==r.PaymentMethod) throw new ConflictException("Məlumat dəyişməyib.");
            var description=$"Ödəniş: {entry.Amount:0.00} ({entry.PaymentMethod}) → {r.Amount:0.00} ({r.PaymentMethod}). Səbəb: {r.Reason.Trim()}";
            entry.Amount=r.Amount; entry.PaymentMethod=r.PaymentMethod;EnsureValidBalances(entries);
            db.Add(new AccountEntryAudit{CustomerId=r.CustomerId,EntryId=entry.Id,UserId=user.UserId,UserName=user.FullName,Description=description});
            return Task.CompletedTask;
        },cancellationToken);
        return await GetByCustomerIdAsync(r.CustomerId,cancellationToken);
    }
}
