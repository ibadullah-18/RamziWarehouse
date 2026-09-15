using GrandWall.Application.Common.Files;

namespace GrandWall.Application.Abstractions.Orders;

public interface IOrderPhotoFileService
{
    Task<FileDownloadDto> DownloadPreparationPhotoAsync(
        Guid orderId,
        Guid photoId,
        CancellationToken cancellationToken = default);

    Task<FileDownloadDto> DownloadDeliveryPhotoAsync(
        Guid orderId,
        Guid photoId,
        CancellationToken cancellationToken = default);

    Task DeletePreparationPhotoAsync(
        Guid orderId,
        Guid photoId,
        CancellationToken cancellationToken = default);
}