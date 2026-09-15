using GrandWall.Domain.Enums;

namespace GrandWall.Application.Features.ProductReturns.Dtos;

public sealed class ProductReturnDto
{
    public Guid Id { get; init; }

    public DateTime ReturnDateUtc { get; init; }

    public Guid CustomerId { get; init; }

    public string CustomerName { get; init; } = string.Empty;

    public Guid WarehouseId { get; init; }

    public string WarehouseName { get; init; } = string.Empty;

    public string? AdditionalNote { get; init; }

    public ReturnStatus Status { get; init; }

    public Guid CreatedByUserId { get; init; }

    public string CreatedByFullName { get; init; } = string.Empty;

    public Guid? ProcessedByUserId { get; init; }

    public string? ProcessedByFullName { get; init; }

    public DateTime? ProcessedAtUtc { get; init; }

    public DateTime CreatedAtUtc { get; init; }

    public DateTime? CompletedAtUtc { get; init; }

    public DateTime? DeleteAfterUtc { get; init; }

    public List<ProductReturnItemDto> Items { get; init; }
        = new();

    public List<ProductReturnPhotoDto> Photos { get; init; }
        = new();

    public List<ProductReturnStatusHistoryDto> StatusHistory { get; init; }
        = new();
}