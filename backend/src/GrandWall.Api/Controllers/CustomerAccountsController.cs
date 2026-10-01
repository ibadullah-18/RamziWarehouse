using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GrandWall.Application.Abstractions.CustomerAccounts;
using GrandWall.Application.Features.CustomerAccounts.Dtos;

namespace GrandWall.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Accountant,Driver")]
[Route("api/customer-accounts")]
public sealed class CustomerAccountsController : ControllerBase
{
    private readonly ICustomerAccountService _service;

    public CustomerAccountsController(ICustomerAccountService service)
    {
        _service = service;
    }

    [HttpGet("report-history")]
    public async Task<IActionResult> ReportHistory(CancellationToken cancellationToken)
        => Ok(await _service.GetReportHistoryAsync(cancellationToken));

    [HttpGet("report")]
    public async Task<IActionResult> Report([FromQuery] DateOnly date, CancellationToken cancellationToken)
        => Ok(await _service.GetReportAsync(date, cancellationToken));

    [HttpPost("close-day")]
    [Authorize(Roles = "Admin,Driver")]
    public async Task<IActionResult> CloseDay(CancellationToken cancellationToken)
        => Ok(await _service.CloseDayAsync(cancellationToken));

    [HttpPut("daily-debt")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> CorrectDaily(CorrectDailyDebtRequestDto request, CancellationToken cancellationToken)
        => Ok(await _service.CorrectDailyAsync(request, cancellationToken));

    [HttpGet]
    public async Task<ActionResult<CustomerAccountListDto>> GetAll(
        [FromQuery] CustomerAccountListQueryDto query,
        CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllAsync(query, cancellationToken));
    }

    [HttpGet("{customerId:guid}")]
    public async Task<ActionResult<CustomerAccountDetailsDto>> GetByCustomerId(
        Guid customerId,
        CancellationToken cancellationToken)
    {
        return Ok(await _service.GetByCustomerIdAsync(
            customerId,
            cancellationToken));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Accountant,Driver")]
    public async Task<ActionResult<CustomerAccountDetailsDto>> CreateToday(
        [FromBody] CreateCustomerAccountRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateTodayAsync(
            request,
            cancellationToken);

        return CreatedAtAction(
            nameof(GetByCustomerId),
            new { customerId = request.CustomerId },
            result);
    }

    [HttpPost("payments")]
    [Authorize(Roles = "Admin,Driver")]
    public async Task<ActionResult<CustomerAccountDetailsDto>> RecordPayment(
        [FromBody] RecordCustomerPaymentRequestDto request,
        CancellationToken cancellationToken)
    {
        return Ok(await _service.RecordPaymentAsync(
            request,
            cancellationToken));
    }

    [HttpPut("previous-debt")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<CustomerAccountDetailsDto>>
        CorrectPreviousDebt(
            [FromBody] CorrectPreviousDebtRequestDto request,
            CancellationToken cancellationToken)
    {
        return Ok(await _service.CorrectPreviousDebtAsync(
            request,
            cancellationToken));
    }
}
