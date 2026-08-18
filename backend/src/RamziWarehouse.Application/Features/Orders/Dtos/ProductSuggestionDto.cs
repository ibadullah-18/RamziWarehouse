using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Application.Features.Orders.Dtos;

public sealed class ProductSuggestionDto
{
    public string ProductCode { get; init; }
        = string.Empty;

    public string PartyNumber { get; init; }
        = string.Empty;

    public ProductType ProductType { get; init; }

    public int UsageCount { get; init; }

    public DateTime LastUsedAtUtc { get; init; }
}