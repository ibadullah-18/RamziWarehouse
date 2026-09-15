using GrandWall.Domain.Enums;

namespace GrandWall.Application.Features.Orders.Dtos;

public sealed class CreateOrderItemRequestDto
{
    public string ProductCode { get; init; } = string.Empty;

    public string PartyNumber { get; init; } = string.Empty;

    public ProductType ProductType { get; init; }

    public int Quantity { get; init; }
}