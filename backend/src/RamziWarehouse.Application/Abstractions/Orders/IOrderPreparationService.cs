using RamziWarehouse.Application.Common.Files;
using RamziWarehouse.Application.Features.Orders.Dtos;

namespace RamziWarehouse.Application.Abstractions.Orders;

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