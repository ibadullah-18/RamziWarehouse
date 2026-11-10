using System.Text.RegularExpressions;
using GrandWall.Application.Common.Exceptions;
using GrandWall.Domain.Entities;
using GrandWall.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using GrandWall.Api.Authorization;
using GrandWall.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GrandWall.Api.Controllers;

/// <summary>
/// A Sədərək customer's return prices by wallpaper code prefix ("10" -> 26 AZN). Everyone who
/// creates returns can read them; the açot staff maintain them.
/// </summary>
[ApiController, Authorize, Route("api/customers/{customerId:guid}/price-rules")]
public sealed class CustomerPriceRulesController(AppDbContext db) : ControllerBase
{
    public sealed record PriceRuleDto(string CodePrefix, decimal Price);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PriceRuleDto>>> List(Guid customerId, CancellationToken ct)
        => Ok(await db.CustomerPriceRules.AsNoTracking()
            .Where(rule => rule.CustomerId == customerId)
            .OrderBy(rule => rule.CodePrefix)
            .Select(rule => new PriceRuleDto(rule.CodePrefix, rule.Price))
            .ToListAsync(ct));

    /// <summary>Replaces the whole list; send every rule that should remain.</summary>
    [HttpPut, RequirePermission(Permission.AccountsPriceRules)]
    public async Task<ActionResult<IReadOnlyList<PriceRuleDto>>> Replace(Guid customerId, List<PriceRuleDto> rules, CancellationToken ct)
    {
        if (!await db.Customers.AnyAsync(c => c.Id == customerId && !c.IsDeleted, ct))
            throw new NotFoundException("Müştəri tapılmadı.");
        if (rules.Count > 200) throw new ConflictException("Ən çox 200 qiymət yazıla bilər.");

        var cleaned = rules.Select(rule => new PriceRuleDto(rule.CodePrefix?.Trim() ?? "", rule.Price)).ToList();
        foreach (var rule in cleaned)
        {
            if (!Regex.IsMatch(rule.CodePrefix, @"^[0-9]{1,10}$"))
                throw new ConflictException("Kodun başlanğıcı yalnız rəqəm olmalıdır (məsələn 10 və ya 50).");
            if (rule.Price < 0 || rule.Price > 1000000 || decimal.Round(rule.Price, 2) != rule.Price)
                throw new ConflictException($"{rule.CodePrefix}: qiymət düzgün deyil.");
        }
        if (cleaned.Select(rule => rule.CodePrefix).Distinct().Count() != cleaned.Count)
            throw new ConflictException("Eyni kod başlanğıcı iki dəfə yazılıb.");

        var existing = await db.CustomerPriceRules.Where(rule => rule.CustomerId == customerId).ToListAsync(ct);
        db.CustomerPriceRules.RemoveRange(existing);
        db.CustomerPriceRules.AddRange(cleaned.Select(rule => new CustomerPriceRule
        {
            CustomerId = customerId,
            CodePrefix = rule.CodePrefix,
            Price = rule.Price,
            UpdatedAtUtc = DateTime.UtcNow
        }));
        await db.SaveChangesAsync(ct);
        return await List(customerId, ct);
    }
}
