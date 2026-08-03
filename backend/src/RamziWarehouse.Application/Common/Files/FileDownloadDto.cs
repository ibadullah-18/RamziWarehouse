namespace RamziWarehouse.Application.Common.Files;

public sealed class FileDownloadDto
{
    public required byte[] Content { get; init; }

    public required string ContentType { get; init; }

    public required string FileName { get; init; }
}