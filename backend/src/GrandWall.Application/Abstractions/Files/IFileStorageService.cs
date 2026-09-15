using GrandWall.Application.Common.Files;

namespace GrandWall.Application.Abstractions.Files;

public interface IFileStorageService
{
    Task<StoredFileDto> UploadImageAsync(
        FileUploadRequest request,
        string folder,
        CancellationToken cancellationToken = default);

    Task<StoredFileContentDto> DownloadImageAsync(
        string publicId,
        CancellationToken cancellationToken = default);

    Task DeleteImageAsync(
        string publicId,
        CancellationToken cancellationToken = default);
}