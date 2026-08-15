namespace RamziWarehouse.Application.Features.Orders.Dtos;

public sealed class DeliveryPhotoDto
{
    public Guid Id { get; init; }

    public string OriginalFileName { get; init; }
        = string.Empty;

    public string ContentType { get; init; }
        = string.Empty;

    public long FileSizeBytes { get; init; }

    public Guid UploadedByUserId { get; init; }

    public string UploadedByFullName { get; init; }
        = string.Empty;

    public DateTime UploadedAtUtc { get; init; }
}