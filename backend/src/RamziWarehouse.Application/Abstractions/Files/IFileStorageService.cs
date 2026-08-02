using RamziWarehouse.Application.Common.Files;

namespace RamziWarehouse.Application.Abstractions.Files;

public interface IFileStorageService
{
    Task<StoredFileDto> UploadImageAsync(
        FileUploadRequest request,
        string folder,
        CancellationToken cancellationToken = default);

    Task DeleteImageAsync(
        string publicId,
        CancellationToken cancellationToken = default);
}