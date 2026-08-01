using RamziWarehouse.Domain.Common;

namespace RamziWarehouse.Domain.Entities;

public sealed class Customer : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public string? PhoneNumber { get; set; }

    public string? Note { get; set; }

    public bool IsActive { get; set; } = true;
}