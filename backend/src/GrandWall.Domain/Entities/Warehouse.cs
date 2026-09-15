using GrandWall.Domain.Common;

namespace GrandWall.Domain.Entities;

public sealed class Warehouse : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}