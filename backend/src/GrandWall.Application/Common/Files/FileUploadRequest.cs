namespace GrandWall.Application.Common.Files;

public sealed class FileUploadRequest
{
    public required Stream Content { get; init; }

    public required string FileName { get; init; }

    public required string ContentType { get; init; }

    public long FileSizeBytes { get; init; }
}