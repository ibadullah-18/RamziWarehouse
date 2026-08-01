using RamziWarehouse.Domain.Common;
using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Domain.Entities;

public sealed class OrderItem : BaseEntity
{
    public Guid OrderId { get; set; }

    public Order Order { get; set; } = null!;

    public string ProductCode { get; set; } = string.Empty;

    public string BatchNumber { get; set; } = string.Empty;

    public int Quantity { get; set; }

    public ProductType ProductType { get; set; }
}