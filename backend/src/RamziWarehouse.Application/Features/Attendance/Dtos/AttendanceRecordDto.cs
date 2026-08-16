namespace RamziWarehouse.Application.Features.Attendance.Dtos;

public sealed class AttendanceRecordDto
{
    public Guid Id { get; init; }

    public Guid UserId { get; init; }

    public string UserFullName { get; init; }
        = string.Empty;

    public DateOnly WorkDate { get; init; }

    public DateTime CheckedInAtUtc { get; init; }

    public DateTime? CheckedOutAtUtc { get; init; }

    public DateTime? CompletedAtUtc { get; init; }

    public DateTime? DeleteAfterUtc { get; init; }

    public bool IsCurrentlyAtWork =>
        !CheckedOutAtUtc.HasValue;
}