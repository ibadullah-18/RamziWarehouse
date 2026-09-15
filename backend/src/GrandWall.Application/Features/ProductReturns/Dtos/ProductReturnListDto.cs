namespace GrandWall.Application.Features.ProductReturns.Dtos;

public sealed class ProductReturnListDto
{
    public IReadOnlyList<ProductReturnDto> Items { get; init; }
        = Array.Empty<ProductReturnDto>();

    public int PageNumber { get; init; }

    public int PageSize { get; init; }

    public int TotalCount { get; init; }

    public int TotalPages =>
        PageSize <= 0
            ? 0
            : (int)Math.Ceiling(
                TotalCount / (double)PageSize);
}