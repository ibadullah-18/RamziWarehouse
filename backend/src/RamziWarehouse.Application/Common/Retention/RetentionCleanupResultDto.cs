namespace RamziWarehouse.Application.Common.Retention;

public sealed class RetentionCleanupResultDto
{
    public int DeletedOrders { get; set; }

    public int DeletedProductReturns { get; set; }

    public int DeletedAttendanceRecords { get; set; }

    public int TotalDeleted =>
        DeletedOrders +
        DeletedProductReturns +
        DeletedAttendanceRecords;
}