namespace GrandWall.Application.Features.ProductReturns.Dtos;
public sealed class CorrectProductReturnDto
{
    public Guid ExpectedRevision { get; init; }
    public string Reason { get; init; } = string.Empty;
    public List<CorrectProductReturnItemDto> Items { get; init; } = [];
}
public sealed class CorrectProductReturnItemDto
{
    public Guid Id { get; init; }
    public string ProductCode { get; init; } = string.Empty;
    public string BatchNumber { get; init; } = string.Empty;
}
public sealed class DeleteProductReturnDto
{
    public Guid ExpectedRevision { get; init; }
    public string Reason { get; init; } = string.Empty;
}
