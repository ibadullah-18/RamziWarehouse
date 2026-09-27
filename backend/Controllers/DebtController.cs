// ==========================================================================
// GrandWall - AÃ§ot Modulu - API Endpoints
// TODO: [Authorize(Roles = "...")] Ã¶z rol sisteminÉ™ uyÄŸunlaÅŸdÄ±r
//       (mÉ™s. "DebtWriter" borc yazan, "DebtCollector" Ã¶dÉ™niÅŸ qÉ™bul edÉ™n).
// TODO: CurrentUserId() - Ã¶z auth context-indÉ™n istifadÉ™Ã§i Id-sini Ã§É™k.
// ==========================================================================

using GrandWall.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GrandWall.Controllers;

[ApiController]
[Route("api/debts")]
[Authorize]
public class DebtController : ControllerBase
{
    private readonly IDebtService _debtService;

    public DebtController(IDebtService debtService)
    {
        _debtService = debtService;
    }

    // AÃ§ot TÉ™xir siyahÄ±sÄ± - É™n Ã§ox gecikÉ™n Ã¼stdÉ™
    [HttpGet("pending")]
    public async Task<IActionResult> GetPending()
    {
        var list = await _debtService.GetPendingDebtListAsync();
        return Ok(list);
    }

    // MÃ¼ÅŸtÉ™rinin tarixÃ§É™si
    [HttpGet("customers/{customerId:guid}/history")]
    public async Task<IActionResult> GetHistory(Guid customerId)
    {
        var history = await _debtService.GetCustomerHistoryAsync(customerId);
        return Ok(history);
    }

    // Yeni gÃ¼ndÉ™lik borc yaz ("AÃ§ot yazan")
    [HttpPost("customers/{customerId:guid}")]
    // [Authorize(Roles = "DebtWriter")]
    public async Task<IActionResult> CreateDailyDebt(Guid customerId, [FromBody] CreateDebtRequest req)
    {
        var userId = CurrentUserId();
        var debt = await _debtService.CreateDailyDebtAsync(customerId, req.Amount, userId);
        return Ok(debt);
    }

    // GÃ¼ndÉ™lik borcu dÃ¼zÉ™lt - sÉ™bÉ™b TÆLÆB OLUNMUR
    [HttpPatch("{dailyDebtId:guid}")]
    public async Task<IActionResult> EditDailyDebt(Guid dailyDebtId, [FromBody] EditDebtRequest req)
    {
        var userId = CurrentUserId();
        var debt = await _debtService.EditDailyDebtAsync(dailyDebtId, req.NewAmount, userId);
        return Ok(debt);
    }

    // Ã–dÉ™niÅŸ qÉ™bul et ("AÃ§ot qÉ™bul edÉ™n")
    [HttpPost("customers/{customerId:guid}/payments")]
    // [Authorize(Roles = "DebtCollector")]
    public async Task<IActionResult> ApplyPayment(Guid customerId, [FromBody] ApplyPaymentRequest req)
    {
        var userId = CurrentUserId();
        var payment = await _debtService.ApplyPaymentAsync(customerId, req.Amount, userId);
        return Ok(payment);
    }

    private Guid CurrentUserId()
    {
        // TODO: JWT claim-dÉ™n oxu, mÉ™s:
        // return Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        throw new NotImplementedException();
    }
}

public record CreateDebtRequest(decimal Amount);
public record EditDebtRequest(decimal NewAmount);
public record ApplyPaymentRequest(decimal Amount);
