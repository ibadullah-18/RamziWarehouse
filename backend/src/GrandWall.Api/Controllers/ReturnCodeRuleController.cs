using GrandWall.Application.Common.Exceptions;
using GrandWall.Domain.Entities;
using GrandWall.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using GrandWall.Api.Authorization;
using GrandWall.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GrandWall.Api.Controllers;

/// <summary>The wallpaper code rule for returns: everyone reads it, only an admin changes it.</summary>
[ApiController, Authorize, Route("api/settings/return-codes")]
public sealed class ReturnCodeRuleController(AppDbContext db) : ControllerBase
{
    public sealed record ReturnCodeRuleDto(int? RequiredLength, bool SecondDigitMustBeZero);

    [HttpGet]
    public async Task<ActionResult<ReturnCodeRuleDto>> Get(CancellationToken ct)
    {
        var rule = await db.ReturnCodeRules.AsNoTracking().FirstOrDefaultAsync(ct);
        return Ok(new ReturnCodeRuleDto(rule?.RequiredLength, rule?.SecondDigitMustBeZero ?? false));
    }

    [HttpPut, RequirePermission(Permission.SettingsManage)]
    public async Task<ActionResult<ReturnCodeRuleDto>> Save(ReturnCodeRuleDto request, CancellationToken ct)
    {
        if (request.RequiredLength is < 1 or > 10)
            throw new ConflictException("Rəqəm sayı 1–10 arasında olmalıdır (boş qoysanız qayda olmur).");
        var rule = await db.ReturnCodeRules.FirstOrDefaultAsync(ct);
        if (rule is null)
        {
            rule = new ReturnCodeRule();
            db.ReturnCodeRules.Add(rule);
        }
        rule.RequiredLength = request.RequiredLength;
        rule.SecondDigitMustBeZero = request.SecondDigitMustBeZero;
        await db.SaveChangesAsync(ct);
        return Ok(new ReturnCodeRuleDto(rule.RequiredLength, rule.SecondDigitMustBeZero));
    }
}
