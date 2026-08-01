using RamziWarehouse.Application.Features.Customers.Dtos;

namespace RamziWarehouse.Application.Abstractions.Customers;

public interface ICustomerService
{
    Task<IReadOnlyList<CustomerDto>> GetAllAsync(
        string? search,
        bool? isActive,
        CancellationToken cancellationToken = default);

    Task<CustomerDto> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<CustomerDto> CreateAsync(
        CreateCustomerRequestDto request,
        CancellationToken cancellationToken = default);

    Task<CustomerDto> UpdateAsync(
        Guid id,
        UpdateCustomerRequestDto request,
        CancellationToken cancellationToken = default);
}