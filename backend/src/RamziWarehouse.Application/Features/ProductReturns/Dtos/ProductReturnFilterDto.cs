using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Application.Features.ProductReturns.Dtos;

public sealed class ProductReturnFilterDto
{
    public string? Search { get; init; }

    public Guid? CustomerId { get; init; }

    public Guid? WarehouseId { get; init; }

    public Guid? CreatedByUserId { get; init; }

    public Guid? ProcessedByUserId { get; init; }

    public ReturnStatus? Status { get; init; }

    public ProductType? ProductType { get; init; }

    public DateTime? FromDateUtc { get; init; }

    public DateTime? ToDateUtc { get; init; }

    public int PageNumber { get; init; } = 1;

    public int PageSize { get; init; } = 20;
}