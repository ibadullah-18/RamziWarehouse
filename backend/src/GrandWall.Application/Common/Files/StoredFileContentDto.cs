namespace GrandWall.Application.Common.Files;

public sealed class StoredFileContentDto
{
    public required byte[] Content { get; init; }

    public required string ContentType { get; init; }
}