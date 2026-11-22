namespace GrandWall.Application.Features.Handovers;

public sealed class HandoverPhotoDto
{
    public Guid Id { get; init; }
}

public sealed class HandoverDto
{
    public Guid Id { get; init; }
    public Guid CustomerId { get; init; }
    public string CustomerName { get; init; } = string.Empty;
    public string? Note { get; init; }
    public DateOnly BusinessDate { get; init; }
    public Guid CreatedByUserId { get; init; }
    public string CreatedByFullName { get; init; } = string.Empty;
    public DateTime CreatedAtUtc { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }
    public IReadOnlyList<HandoverPhotoDto> Photos { get; init; } = [];

    /// <summary>The signed-in user may change the customer/note or delete it.</summary>
    public bool CanEdit { get; init; }
}

/// <summary>One day's sheet: a new day starts with an empty list.</summary>
public sealed class HandoverDayDto
{
    public DateOnly Date { get; init; }
    public bool IsToday { get; init; }
    public IReadOnlyList<HandoverDto> Items { get; init; } = [];
}

public sealed class UpdateHandoverRequest
{
    public Guid CustomerId { get; init; }
    public string? Note { get; init; }
}

public sealed class HandoverPhotoUpload
{
    public required Stream Content { get; init; }
    public required string FileName { get; init; }
    public required string ContentType { get; init; }
    public long Length { get; init; }
}
