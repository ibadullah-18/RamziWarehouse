namespace GrandWall.Application.Features.Customers.Dtos;

public sealed class UpdateCustomerRequestDto
{
    public string Name { get; init; } = string.Empty;

    public string? PhoneNumber { get; init; }

    public string? Note { get; init; }

    public bool? IsActive { get; init; }
}