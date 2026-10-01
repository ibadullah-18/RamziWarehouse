using GrandWall.Application.Common.Exceptions;
using GrandWall.Application.Features.ProductReturns.Dtos;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GrandWall.Infrastructure.Services;
public sealed partial class ProductReturnService
{
    private void EnsureChangeReason(string reason)
    {
        if (!_currentUserService.IsAuthenticated) throw new ForbiddenException("Sistemə daxil olun.");
        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length < 3 || reason.Length > 400)
            throw new ConflictException("Səbəb 3–400 simvol olmalıdır.");
    }
    private async Task<ProductReturn> EditableReturn(Guid id, Guid revision, CancellationToken ct)
    {
        var record = await _dbContext.ProductReturns.Include(r=>r.Items).FirstOrDefaultAsync(r=>r.Id==id && !r.IsDeleted,ct)
            ?? throw new NotFoundException("Vazvrad tapılmadı.");
        if (record.Revision != revision) throw new ConflictException("Qeyd dəyişdirilib. Səhifəni yeniləyin.");
        return record;
    }
    public async Task<ProductReturnDto> CorrectAsync(Guid id, CorrectProductReturnDto request, CancellationToken cancellationToken = default)
    {
        EnsureChangeReason(request.Reason);
        var record=await EditableReturn(id,request.ExpectedRevision,cancellationToken);
        EnsureReturnChangeAllowed(record);
        if(request.Items==null || request.Items.Count is <1 or >500 || request.Items.Where(i=>i.Id!=Guid.Empty).Select(i=>i.Id).Distinct().Count()!=request.Items.Count(i=>i.Id!=Guid.Empty) || request.Items.Any(i=>i.Id!=Guid.Empty && !record.Items.Any(old=>old.Id==i.Id)))
            throw new ConflictException("Məhsul siyahısı düzgün deyil. Səhifəni yeniləyin.");
        var changes=new List<string>();
        var candidates=new List<(ProductReturnItem Item,string Code,string Batch,int Quantity,ProductType Type)>();
        foreach(var input in request.Items)
        {
            var code=input.ProductCode?.Trim()??"";var batch=input.BatchNumber?.Trim()??"";
            if(code.Length is <1 or >50 || batch.Length is <1 or >50) throw new ConflictException("Kod və partiya 1–50 simvol olmalıdır.");
            var item=input.Id==Guid.Empty ? new ProductReturnItem{ProductReturnId=record.Id} : record.Items.Single(i=>i.Id==input.Id);
            var quantity=input.Quantity??item.Quantity; var type=input.ProductType??item.ProductType;
            if(quantity<1 || quantity>1000000 || !Enum.IsDefined(type)) throw new ConflictException("Məhsulun sayı və növü düzgün deyil.");
            if(input.Id==Guid.Empty || item.ProductCode!=code || item.BatchNumber!=batch || item.Quantity!=quantity || item.ProductType!=type)
                changes.Add($"Kod: {item.ProductCode} → {code}; partiya: {item.BatchNumber} → {batch}; say: {item.Quantity} → {quantity}; növ: {item.ProductType} → {type}.");
            candidates.Add((item,code,batch,quantity,type));
        }
        var removed=record.Items.Where(i=>!request.Items.Any(r=>r.Id==i.Id)).ToList();
        foreach(var item in removed) changes.Add($"Məhsul silindi: {item.ProductCode}, partiya {item.BatchNumber}, {item.Quantity} ədəd.");
        if(changes.Count==0) throw new ConflictException("Məlumat dəyişməyib.");
        if(candidates.GroupBy(i=>new{Code=i.Code.ToUpperInvariant(),Batch=i.Batch.ToUpperInvariant(),i.Type}).Any(g=>g.Count()>1))
            throw new ConflictException("Eyni kod, partiya və növ təkrarlana bilməz.");
        foreach(var item in removed) _dbContext.ProductReturnItems.Remove(item);
        foreach(var candidate in candidates){candidate.Item.ProductCode=candidate.Code;candidate.Item.BatchNumber=candidate.Batch;candidate.Item.Quantity=candidate.Quantity;candidate.Item.ProductType=candidate.Type;if(!record.Items.Contains(candidate.Item)){record.Items.Add(candidate.Item);_dbContext.ProductReturnItems.Add(candidate.Item);}}
        foreach(var change in changes) AddAdministrationAudit(record, $"Düzəliş. {change} Səbəb: {request.Reason.Trim()}");
        record.Revision=Guid.NewGuid();
        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id,cancellationToken);
    }
    public async Task DeleteAsync(Guid id, DeleteProductReturnDto request, CancellationToken cancellationToken = default)
    {
        EnsureChangeReason(request.Reason);
        var record=await EditableReturn(id,request.ExpectedRevision,cancellationToken);
        EnsureReturnChangeAllowed(record);
        AddAdministrationAudit(record,$"Qeyd silindi. Səbəb: {request.Reason.Trim()}");
        record.IsDeleted=true;
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
    private void EnsureReturnChangeAllowed(ProductReturn record)
    {
        if(!_currentUserService.Role.IsAdmin() && record.Status is not (ReturnStatus.Pending or ReturnStatus.Submitted))
            throw new ForbiddenException("Menecer təsdiqindən sonra qeydi yalnız admin dəyişə və silə bilər.");
    }
    private void AddAdministrationAudit(ProductReturn record,string note) => _dbContext.ProductReturnStatusHistories.Add(new ProductReturnStatusHistory {
        ProductReturnId=record.Id,PreviousStatus=record.Status,NewStatus=record.Status,ChangedByUserId=_currentUserService.UserId,Note=note
    });
}
