namespace GrandWall.Domain.Entities;

/// <summary>
/// "Mal təhvil": proof that goods were handed to a customer — up to 10 photos, the customer
/// and an optional note. Lists are per day (Baku date); a new day starts an empty list.
/// </summary>
public sealed class Handover
{
    public const int MaxPhotos = 10;
    public const int MaxNoteLength = 1000;

    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Client operation id: sending the same handover twice stores it once.</summary>
    public Guid OperationId { get; set; }

    public Guid CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string? Note { get; set; }

    public DateOnly BusinessDate { get; set; }

    public Guid CreatedByUserId { get; set; }

    public string CreatedByFullName { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }

    public bool IsDeleted { get; set; }

    public List<HandoverPhoto> Photos { get; set; } = [];
}

public sealed class HandoverPhoto
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid HandoverId { get; set; }

    public int SortOrder { get; set; }

    public string StoragePublicId { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public long FileSizeBytes { get; set; }
}
