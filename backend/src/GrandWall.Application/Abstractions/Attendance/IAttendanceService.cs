using GrandWall.Application.Common.Models;
using GrandWall.Application.Features.Attendance.Dtos;

namespace GrandWall.Application.Abstractions.Attendance;

public interface IAttendanceService
{
    Task<PagedResultDto<AttendanceRecordDto>> GetAllAsync(
        AttendanceQueryDto query,
        CancellationToken cancellationToken = default);

    Task<AttendanceRecordDto?> GetMyTodayAsync(
        CancellationToken cancellationToken = default);

    Task<AttendanceRecordDto> CheckInAsync(
        CancellationToken cancellationToken = default);

    Task<AttendanceRecordDto> CheckOutAsync(
        CancellationToken cancellationToken = default);
}