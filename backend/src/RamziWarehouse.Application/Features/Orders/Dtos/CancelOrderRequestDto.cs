namespace RamziWarehouse.Application.Features.Orders.Dtos;

public sealed class CancelOrderRequestDto
{
    public string Note { get; init; } = string.Empty;
}