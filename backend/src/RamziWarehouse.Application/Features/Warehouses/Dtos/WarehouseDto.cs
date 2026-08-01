namespace RamziWarehouse.Application.Features.Warehouses.Dtos;

public sealed class WarehouseDto
{
    public Guid Id { get; init; }

    public string Name { get; init; } = string.Empty;

    public bool IsActive { get; init; }

    public DateTime CreatedAtUtc { get; init; }

    public DateTime? UpdatedAtUtc { get; init; }
}