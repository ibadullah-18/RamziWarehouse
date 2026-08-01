namespace RamziWarehouse.Application.Features.Customers.Dtos;

public sealed class CreateCustomerRequestDto
{
    public string Name { get; init; } = string.Empty;

    public string? PhoneNumber { get; init; }

    public string? Note { get; init; }
}