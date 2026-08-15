using RamziWarehouse.Application.Common.Files;
using RamziWarehouse.Application.Features.Orders.Dtos;

namespace RamziWarehouse.Application.Abstractions.Orders;

public interface IOrderDeliveryService
{
    Task<OrderDeliveryDto> GetByOrderIdAsync(
        Guid orderId,
        CancellationToken cancellationToken = default);

    Task<DeliveryPhotoDto> UploadPhotoAsync(
        Guid orderId,
        FileUploadRequest file,
        CancellationToken cancellationToken = default);

    Task DeletePhotoAsync(
        Guid orderId,
        Guid photoId,
        CancellationToken cancellationToken = default);

    Task<OrderDto> CompleteAsync(
        Guid orderId,
        CompleteOrderDeliveryRequestDto request,
        CancellationToken cancellationToken = default);
}