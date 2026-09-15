namespace GrandWall.Application.Features.ProductReturns.Dtos;

public sealed class ProductReturnPhotoDto
{
    public Guid Id { get; init; }

    public string OriginalFileName { get; init; } = string.Empty;

    public string ContentType { get; init; } = string.Empty;

    public long FileSizeBytes { get; init; }

    public Guid UploadedByUserId { get; init; }

    public string UploadedByFullName { get; init; } = string.Empty;

    public DateTime CreatedAtUtc { get; init; }
}