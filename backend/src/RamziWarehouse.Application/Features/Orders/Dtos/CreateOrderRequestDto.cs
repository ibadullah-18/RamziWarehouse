namespace RamziWarehouse.Application.Features.Orders.Dtos;

public sealed class CreateOrderRequestDto
{
    public string OrderNumber { get; init; } = string.Empty;

    public DateTime OrderDate { get; init; }

    public Guid CustomerId { get; init; }

    public Guid WarehouseId { get; init; }

    public string? Note { get; init; }

    public IReadOnlyCollection<CreateOrderItemRequestDto> Items { get; init; }
        = [];
}