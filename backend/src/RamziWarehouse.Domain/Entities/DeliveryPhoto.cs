using RamziWarehouse.Domain.Common;

namespace RamziWarehouse.Domain.Entities;

public sealed class DeliveryPhoto : BaseEntity
{
    public Guid OrderDeliveryId { get; set; }

    public OrderDelivery OrderDelivery { get; set; } = null!;

    public string CloudinaryPublicId { get; set; } = string.Empty;

    public string OriginalFileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public long FileSizeBytes { get; set; }

    public Guid UploadedByUserId { get; set; }

    public User UploadedByUser { get; set; } = null!;
}