namespace GrandWall.Application.Common.Files;

public sealed class StoredFileDto
{
    public string PublicId { get; init; } = string.Empty;

    public string OriginalFileName { get; init; } = string.Empty;

    public string ContentType { get; init; } = string.Empty;

    public long FileSizeBytes { get; init; }
}