namespace GrandWall.Application.Features.ProductReturns.Dtos;

public sealed class CreateProductReturnDto
{
    public decimal Amount { get; init; }
    public Guid? ReturnPersonId { get; init; }

    /// <summary>Sədərək customer: keep the debt as it is (the amount is only recorded).</summary>
    public bool DoNotDeductFromDebt { get; init; }
    public Guid CustomerId { get; init; }

    public Guid WarehouseId { get; init; }

    public string? AdditionalNote { get; init; }

    public List<CreateProductReturnItemDto> Items { get; init; }
        = new();
}
