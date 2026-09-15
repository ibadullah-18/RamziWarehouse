using GrandWall.Domain.Common;

namespace GrandWall.Domain.Entities;

public sealed class OrderPreparationPhoto : BaseEntity
{
    public Guid OrderId { get; set; }

    public Order Order { get; set; } = null!;

    public string CloudinaryPublicId { get; set; } = string.Empty;

    public string OriginalFileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public long FileSizeBytes { get; set; }

    public Guid UploadedByUserId { get; set; }

    public User UploadedByUser { get; set; } = null!;
}