namespace RamziWarehouse.Application.Features.Attendance.Dtos;

public sealed class AttendanceQueryDto
{
    public string? Search { get; init; }

    public Guid? UserId { get; init; }

    public DateOnly? FromDate { get; init; }

    public DateOnly? ToDate { get; init; }

    public int PageNumber { get; init; } = 1;

    public int PageSize { get; init; } = 20;
}