using GrandWall.Application.Common.Exceptions;
using GrandWall.Application.Features.ProductReturns.Dtos;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GrandWall.Infrastructure.Services;
public sealed partial class ProductReturnService
{
    private void EnsureAdminChange(string reason)
    {
        if (!_currentUserService.Role.IsAdmin()) throw new ForbiddenException("Bu əməliyyatı yalnız admin edə bilər.");
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
        EnsureAdminChange(request.Reason);
        var record=await EditableReturn(id,request.ExpectedRevision,cancellationToken);
        if(record.Status!=ReturnStatus.Completed) throw new ConflictException("Yalnız təsdiqlənmiş vazvradın kod və partiyası düzəldilir.");
        if(request.Items==null || request.Items.Count!=record.Items.Count || request.Items.Select(i=>i.Id).Distinct().Count()!=request.Items.Count || request.Items.Any(i=>!record.Items.Any(old=>old.Id==i.Id)))
            throw new ConflictException("Məhsul siyahısı dəyişdirilə bilməz. Səhifəni yeniləyin.");
        var changes=new List<string>();
        var candidates=new List<(ProductReturnItem Item,string Code,string Batch)>();
        foreach(var input in request.Items)
        {
            var code=input.ProductCode?.Trim()??"";var batch=input.BatchNumber?.Trim()??"";
            if(code.Length is <1 or >50 || batch.Length is <1 or >50) throw new ConflictException("Kod və partiya 1–50 simvol olmalıdır.");
            var item=record.Items.Single(i=>i.Id==input.Id);
            if(item.ProductCode!=code || item.BatchNumber!=batch)
                changes.Add($"Kod: {item.ProductCode} → {code}; partiya: {item.BatchNumber} → {batch}.");
            candidates.Add((item,code,batch));
        }
        if(changes.Count==0) throw new ConflictException("Məlumat dəyişməyib.");
        if(candidates.GroupBy(i=>new{Code=i.Code.ToUpperInvariant(),Batch=i.Batch.ToUpperInvariant(),i.Item.ProductType}).Any(g=>g.Count()>1))
            throw new ConflictException("Eyni kod, partiya və növ təkrarlana bilməz.");
        foreach(var candidate in candidates){candidate.Item.ProductCode=candidate.Code;candidate.Item.BatchNumber=candidate.Batch;}
        foreach(var change in changes) AddAdministrationAudit(record, $"Düzəliş. {change} Səbəb: {request.Reason.Trim()}");
        record.Revision=Guid.NewGuid();
        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id,cancellationToken);
    }
    public async Task DeleteAsync(Guid id, DeleteProductReturnDto request, CancellationToken cancellationToken = default)
    {
        EnsureAdminChange(request.Reason);
        var record=await EditableReturn(id,request.ExpectedRevision,cancellationToken);
        AddAdministrationAudit(record,$"Admin tərəfindən silindi. Səbəb: {request.Reason.Trim()}");
        record.IsDeleted=true;
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
    private void AddAdministrationAudit(ProductReturn record,string note) => _dbContext.ProductReturnStatusHistories.Add(new ProductReturnStatusHistory {
        ProductReturnId=record.Id,PreviousStatus=record.Status,NewStatus=record.Status,ChangedByUserId=_currentUserService.UserId,Note=note
    });
}
