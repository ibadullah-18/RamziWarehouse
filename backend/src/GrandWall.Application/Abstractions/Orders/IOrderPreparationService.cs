using GrandWall.Application.Common.Files;
using GrandWall.Application.Features.Orders.Dtos;

namespace GrandWall.Application.Abstractions.Orders;

public interface IOrderPreparationService
{
    Task<OrderPreparationPhotoDto> UploadPhotoAsync(
        Guid orderId,
        FileUploadRequest file,
        CancellationToken cancellationToken = default);

    Task<OrderDto> CompletePreparationAsync(
        Guid orderId,
        CancellationToken cancellationToken = default);
}