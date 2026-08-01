using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Application.Features.Orders.Dtos;

public sealed class OrderItemDto
{
    public Guid Id { get; init; }

    public string ProductCode { get; init; } = string.Empty;

    public string PartyNumber { get; init; } = string.Empty;

    public ProductType ProductType { get; init; }

    public int Quantity { get; init; }
}