using GrandWall.Domain.Entities;

namespace GrandWall.Domain.UnitTests.Entities;

public sealed class AttendanceRecordTests
{
    [Fact]
    public void CheckOut_ShouldCompleteRecordAndStartRetention()
    {
        var checkedInAtUtc = new DateTime(
            2026,
            8,
            16,
            5,
            0,
            0,
            DateTimeKind.Utc);

        var checkedOutAtUtc = new DateTime(
            2026,
            8,
            16,
            14,
            0,
            0,
            DateTimeKind.Utc);

        var record = new AttendanceRecord
        {
            UserId = Guid.NewGuid(),
            WorkDate = new DateOnly(2026, 8, 16),
            CheckedInAtUtc = checkedInAtUtc
        };

        record.CheckOut(checkedOutAtUtc);

        Assert.True(record.CheckedOutAtUtc.HasValue);
        Assert.Equal(
            checkedOutAtUtc,
            record.CheckedOutAtUtc.Value);

        Assert.True(record.CompletedAtUtc.HasValue);
        Assert.Equal(
            checkedOutAtUtc,
            record.CompletedAtUtc.Value);

        Assert.True(record.DeleteAfterUtc.HasValue);
        Assert.Equal(
            checkedOutAtUtc.AddDays(40),
            record.DeleteAfterUtc.Value);
    }

    [Fact]
    public void CheckOut_ShouldThrow_WhenAlreadyCheckedOut()
    {
        var checkedInAtUtc = new DateTime(
            2026,
            8,
            16,
            5,
            0,
            0,
            DateTimeKind.Utc);

        var firstCheckOutAtUtc =
            checkedInAtUtc.AddHours(8);

        var record = new AttendanceRecord
        {
            UserId = Guid.NewGuid(),
            WorkDate = new DateOnly(2026, 8, 16),
            CheckedInAtUtc = checkedInAtUtc
        };

        record.CheckOut(firstCheckOutAtUtc);

        Assert.Throws<InvalidOperationException>(
            () => record.CheckOut(
                firstCheckOutAtUtc.AddMinutes(1)));
    }

    [Fact]
    public void CheckOut_ShouldThrow_WhenTimeIsBeforeCheckIn()
    {
        var checkedInAtUtc = new DateTime(
            2026,
            8,
            16,
            5,
            0,
            0,
            DateTimeKind.Utc);

        var record = new AttendanceRecord
        {
            UserId = Guid.NewGuid(),
            WorkDate = new DateOnly(2026, 8, 16),
            CheckedInAtUtc = checkedInAtUtc
        };

        Assert.Throws<InvalidOperationException>(
            () => record.CheckOut(
                checkedInAtUtc.AddMinutes(-1)));
    }
}