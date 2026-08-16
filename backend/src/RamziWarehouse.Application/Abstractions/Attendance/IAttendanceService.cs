using RamziWarehouse.Application.Common.Models;
using RamziWarehouse.Application.Features.Attendance.Dtos;

namespace RamziWarehouse.Application.Abstractions.Attendance;

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