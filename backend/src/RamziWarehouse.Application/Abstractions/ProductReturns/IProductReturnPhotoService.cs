using RamziWarehouse.Application.Common.Files;
using RamziWarehouse.Application.Features.ProductReturns.Dtos;

namespace RamziWarehouse.Application.Abstractions.ProductReturns;

public interface IProductReturnPhotoService
{
    Task<ProductReturnPhotoDto> UploadPhotoAsync(
        Guid productReturnId,
        FileUploadRequest file,
        CancellationToken cancellationToken = default);

    Task<FileDownloadDto> DownloadPhotoAsync(
        Guid productReturnId,
        Guid photoId,
        CancellationToken cancellationToken = default);

    Task DeletePhotoAsync(
        Guid productReturnId,
        Guid photoId,
        CancellationToken cancellationToken = default);
}