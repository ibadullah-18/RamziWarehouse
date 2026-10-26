using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GrandWall.Application.Abstractions.CustomerAccounts;
using GrandWall.Application.Features.CustomerAccounts.Dtos;

namespace GrandWall.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Accountant,Driver")]
[Route("api/customer-accounts")]
public sealed class CustomerAccountsController(ICustomerAccountService service) : ControllerBase
{
    /// <summary>One açot day: roster of customers with old/daily debt, payments and totals.</summary>
    [HttpGet("day")]
    public async Task<ActionResult<AccountDayDto>> GetDay([FromQuery] DateOnly date, CancellationToken cancellationToken)
        => Ok(await service.GetDayAsync(date, cancellationToken));

    [HttpPost("day/start")]
    public async Task<ActionResult<AccountDayDto>> StartDay(CancellationToken cancellationToken)
        => Ok(await service.StartDayAsync(cancellationToken));

    [HttpPut("day/debts")]
    public async Task<ActionResult<AccountDayDto>> SaveDailyDebts(SaveDailyDebtsRequestDto request, CancellationToken cancellationToken)
        => Ok(await service.SaveDailyDebtsAsync(request, cancellationToken));

    [HttpPost("day/close")]
    public async Task<ActionResult<AccountDayDto>> CloseDay(CancellationToken cancellationToken)
        => Ok(await service.CloseDayAsync(cancellationToken));

    [HttpPost("settlements")]
    public async Task<ActionResult<CustomerAccountDetailsDto>> CompleteSettlement(CompleteSettlementRequest request, CancellationToken cancellationToken)
        => Ok(await service.CompleteSettlementAsync(request, cancellationToken));

    /// <summary>Per-day totals of a month (YYYY-MM): collected, cash, card.</summary>
    [HttpGet("history")]
    public async Task<ActionResult<AccountHistoryMonthDto>> History([FromQuery] string month, CancellationToken cancellationToken)
        => Ok(await service.GetHistoryAsync(month, cancellationToken));

    [HttpGet("{customerId:guid}/month")]
    public async Task<ActionResult<CustomerMonthDto>> CustomerMonth(Guid customerId, [FromQuery] string month, CancellationToken cancellationToken)
        => Ok(await service.GetCustomerMonthAsync(customerId, month, cancellationToken));

    [HttpGet]
    public async Task<ActionResult<CustomerAccountListDto>> GetAll([FromQuery] CustomerAccountListQueryDto query, CancellationToken cancellationToken)
        => Ok(await service.GetAllAsync(query, cancellationToken));

    [HttpGet("{customerId:guid}")]
    public async Task<ActionResult<CustomerAccountDetailsDto>> GetByCustomerId(Guid customerId, CancellationToken cancellationToken)
        => Ok(await service.GetByCustomerIdAsync(customerId, cancellationToken));

    [HttpPut("payments")]
    public async Task<ActionResult<CustomerAccountDetailsDto>> CorrectPayment(CorrectAccountPaymentRequestDto request, CancellationToken cancellationToken)
        => Ok(await service.CorrectPaymentAsync(request, cancellationToken));

    [HttpPut("daily-debt")]
    public async Task<ActionResult<CustomerAccountDetailsDto>> CorrectDaily(CorrectDailyDebtRequestDto request, CancellationToken cancellationToken)
        => Ok(await service.CorrectDailyAsync(request, cancellationToken));

    /// <summary>Add to or set the old debt or today's daily debt (Sədərək customer page).</summary>
    [HttpPost("adjust")]
    public async Task<ActionResult<CustomerAccountDetailsDto>> AdjustDebt(AdjustDebtRequestDto request, CancellationToken cancellationToken)
        => Ok(await service.AdjustDebtAsync(request, cancellationToken));

    [HttpPut("previous-debt")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<CustomerAccountDetailsDto>> CorrectPreviousDebt(CorrectPreviousDebtRequestDto request, CancellationToken cancellationToken)
        => Ok(await service.CorrectPreviousDebtAsync(request, cancellationToken));
}
