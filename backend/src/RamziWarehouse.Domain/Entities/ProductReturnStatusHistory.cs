using RamziWarehouse.Domain.Common;
using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Domain.Entities;

public sealed class ProductReturnStatusHistory : BaseEntity
{
    public Guid ProductReturnId { get; set; }

    public ProductReturn ProductReturn { get; set; } = null!;

    public ReturnStatus? PreviousStatus { get; set; }

    public ReturnStatus NewStatus { get; set; }

    public Guid ChangedByUserId { get; set; }

    public User ChangedByUser { get; set; } = null!;

    public string? Note { get; set; }
}