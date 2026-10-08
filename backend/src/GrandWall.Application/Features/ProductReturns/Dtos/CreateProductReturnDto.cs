namespace GrandWall.Application.Features.ProductReturns.Dtos;

public sealed class CreateProductReturnDto
{
    public decimal Amount { get; init; }
    public Guid? ReturnPersonId { get; init; }
    public Guid CustomerId { get; init; }

    public Guid WarehouseId { get; init; }

    public string? AdditionalNote { get; init; }

    public List<CreateProductReturnItemDto> Items { get; init; }
        = new();
}
