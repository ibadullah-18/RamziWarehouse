using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Application.Features.ProductReturns.Dtos;

public sealed class ProductReturnStatusHistoryDto
{
    public Guid Id { get; init; }

    public ReturnStatus? PreviousStatus { get; init; }

    public ReturnStatus NewStatus { get; init; }

    public Guid ChangedByUserId { get; init; }

    public string ChangedByFullName { get; init; } = string.Empty;

    public string? Note { get; init; }

    public DateTime ChangedAtUtc { get; init; }
}