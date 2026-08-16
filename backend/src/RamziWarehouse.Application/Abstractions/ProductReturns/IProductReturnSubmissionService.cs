using RamziWarehouse.Application.Features.ProductReturns.Dtos;

namespace RamziWarehouse.Application.Abstractions.ProductReturns;

public interface IProductReturnSubmissionService
{
    Task<ProductReturnDto> SubmitAsync(
        Guid productReturnId,
        CancellationToken cancellationToken = default);
}