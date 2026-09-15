namespace GrandWall.Application.Features.ProductReturns.Dtos;

public sealed class CreateProductReturnDto
{
    public Guid CustomerId { get; init; }

    public Guid WarehouseId { get; init; }

    public string? AdditionalNote { get; init; }

    public List<CreateProductReturnItemDto> Items { get; init; }
        = new();
}