namespace RamziWarehouse.Domain.Enums;

public enum ReturnStatus
{
    Pending = 1,
    Completed = 2,
    Cancelled = 3,

    // İşçi şəkilləri əlavə edib menecerə təqdim edib.
    Submitted = 4
}