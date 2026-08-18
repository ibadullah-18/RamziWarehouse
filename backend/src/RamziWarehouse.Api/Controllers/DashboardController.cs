using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RamziWarehouse.Application.Abstractions.Dashboard;
using RamziWarehouse.Application.Features.Dashboard.Dtos;

namespace RamziWarehouse.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public sealed class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(
        IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary(
        CancellationToken cancellationToken)
    {
        var summary =
            await _dashboardService.GetSummaryAsync(
                cancellationToken);

        return Ok(summary);
    }
}