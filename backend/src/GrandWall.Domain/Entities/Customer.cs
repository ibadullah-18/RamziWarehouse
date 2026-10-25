using GrandWall.Domain.Common;

namespace GrandWall.Domain.Entities;

public sealed class Customer : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public string? PhoneNumber { get; set; }

    public string? Note { get; set; }

    public bool IsDeleted { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>Sədərək dükanı: only these customers are listed and chosen in the açot.</summary>
    public bool IsAccountCustomer { get; set; }
}
