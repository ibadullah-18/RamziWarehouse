using GrandWall.Application.Features.ProductReturns.Dtos;

namespace GrandWall.Application.Abstractions.ProductReturns;

public interface IProductReturnSubmissionService
{
    Task<ProductReturnDto> SubmitAsync(
        Guid productReturnId,
        CancellationToken cancellationToken = default);
}