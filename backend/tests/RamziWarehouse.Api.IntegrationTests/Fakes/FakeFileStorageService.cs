using System.Collections.Concurrent;
using RamziWarehouse.Application.Abstractions.Files;
using RamziWarehouse.Application.Common.Files;

namespace RamziWarehouse.Api.IntegrationTests.Fakes;

public sealed class FakeFileStorageService
    : IFileStorageService
{
    private readonly ConcurrentDictionary<
        string,
        StoredFileContentDto> _files = new();

    public async Task<StoredFileDto> UploadImageAsync(
        FileUploadRequest request,
        string folder,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        await using var memoryStream =
            new MemoryStream();

        await request.Content.CopyToAsync(
            memoryStream,
            cancellationToken);

        var content = memoryStream.ToArray();

        if (content.Length == 0)
        {
            throw new InvalidOperationException(
                "Test şəkli boş ola bilməz.");
        }

        var normalizedFolder =
            folder.Trim().TrimEnd('/');

        var publicId =
            $"{normalizedFolder}/{Guid.NewGuid():N}";

        var storedContent = new StoredFileContentDto
        {
            Content = content,
            ContentType = request.ContentType
        };

        if (!_files.TryAdd(publicId, storedContent))
        {
            throw new InvalidOperationException(
                "Test şəkli yaddaşa əlavə edilmədi.");
        }

        return new StoredFileDto
        {
            PublicId = publicId,
            OriginalFileName =
                Path.GetFileName(request.FileName),

            ContentType = request.ContentType,
            FileSizeBytes = content.LongLength
        };
    }

    public Task<StoredFileContentDto> DownloadImageAsync(
        string publicId,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (!_files.TryGetValue(
                publicId,
                out var storedContent))
        {
            throw new FileNotFoundException(
                "Test şəkli tapılmadı.",
                publicId);
        }

        return Task.FromResult(
            new StoredFileContentDto
            {
                Content = storedContent.Content.ToArray(),
                ContentType = storedContent.ContentType
            });
    }

    public Task DeleteImageAsync(
        string publicId,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        _files.TryRemove(
            publicId,
            out _);

        return Task.CompletedTask;
    }
}