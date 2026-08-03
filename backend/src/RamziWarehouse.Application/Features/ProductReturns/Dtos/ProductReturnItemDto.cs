using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Application.Features.ProductReturns.Dtos;

public sealed class ProductReturnItemDto
{
    public Guid Id { get; init; }

    public string ProductCode { get; init; } = string.Empty;

    public string BatchNumber { get; init; } = string.Empty;

    public int Quantity { get; init; }

    public ProductType ProductType { get; init; }
}