namespace RamziWarehouse.Application.Features.Customers.Dtos;

public sealed class CustomerDto
{
    public Guid Id { get; init; }

    public string Name { get; init; } = string.Empty;

    public string? PhoneNumber { get; init; }

    public string? Note { get; init; }

    public bool IsActive { get; init; }

    public DateTime CreatedAtUtc { get; init; }

    public DateTime? UpdatedAtUtc { get; init; }
}