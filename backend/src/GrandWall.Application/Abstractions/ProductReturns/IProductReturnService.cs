using GrandWall.Application.Features.ProductReturns.Dtos;

namespace GrandWall.Application.Abstractions.ProductReturns;

public interface IProductReturnService
{
    Task<ProductReturnListDto> GetAllAsync(
        ProductReturnFilterDto filter,
        CancellationToken cancellationToken = default);

    Task<ProductReturnDto> GetByIdAsync(
        Guid productReturnId,
        CancellationToken cancellationToken = default);

    Task<ProductReturnDto> CreateAsync(
        CreateProductReturnDto request,
        CancellationToken cancellationToken = default);

    Task<ProductReturnDto> CompleteAsync(
        Guid productReturnId,
        ProcessProductReturnDto request,
        CancellationToken cancellationToken = default);

    Task<ProductReturnDto> CancelAsync(
        Guid productReturnId,
        ProcessProductReturnDto request,
        CancellationToken cancellationToken = default);
}