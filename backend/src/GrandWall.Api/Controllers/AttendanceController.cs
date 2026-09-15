using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GrandWall.Application.Abstractions.Attendance;
using GrandWall.Application.Common.Models;
using GrandWall.Application.Features.Attendance.Dtos;

namespace GrandWall.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/attendance")]
public sealed class AttendanceController : ControllerBase
{
    private readonly IAttendanceService _attendanceService;

    public AttendanceController(
        IAttendanceService attendanceService)
    {
        _attendanceService = attendanceService;
    }

    [HttpGet]
    public async Task<
        ActionResult<PagedResultDto<AttendanceRecordDto>>> GetAll(
            [FromQuery] AttendanceQueryDto query,
            CancellationToken cancellationToken)
    {
        var result = await _attendanceService.GetAllAsync(
            query,
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("me/today")]
    public async Task<ActionResult<AttendanceRecordDto?>>
        GetMyToday(
            CancellationToken cancellationToken)
    {
        var result =
            await _attendanceService.GetMyTodayAsync(
                cancellationToken);

        return Ok(result);
    }

    [HttpPost("check-in")]
    public async Task<ActionResult<AttendanceRecordDto>>
        CheckIn(
            CancellationToken cancellationToken)
    {
        var result =
            await _attendanceService.CheckInAsync(
                cancellationToken);

        return Ok(result);
    }

    [HttpPost("check-out")]
    public async Task<ActionResult<AttendanceRecordDto>>
        CheckOut(
            CancellationToken cancellationToken)
    {
        var result =
            await _attendanceService.CheckOutAsync(
                cancellationToken);

        return Ok(result);
    }
}