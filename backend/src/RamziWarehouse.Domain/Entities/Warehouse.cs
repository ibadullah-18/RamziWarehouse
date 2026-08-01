using RamziWarehouse.Domain.Common;

namespace RamziWarehouse.Domain.Entities;

public sealed class Warehouse : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}