using Microsoft.EntityFrameworkCore;
using GrandWall.Application.Abstractions.Customers;
using GrandWall.Application.Common.Exceptions;
using GrandWall.Application.Features.Customers.Dtos;
using GrandWall.Domain.Entities;
using GrandWall.Infrastructure.Persistence;

namespace GrandWall.Infrastructure.Services;

public sealed class CustomerService : ICustomerService
{
    private readonly AppDbContext _dbContext;

    public CustomerService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<CustomerDto>> GetAllAsync(
        string? search,
        bool? isActive,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Customers
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchValue = search.Trim();

            query = query.Where(customer =>
                customer.Name.Contains(searchValue) ||
                (customer.PhoneNumber != null &&
                 customer.PhoneNumber.Contains(searchValue)));
        }

        if (isActive.HasValue)
        {
            query = query.Where(customer =>
                customer.IsActive == isActive.Value);
        }

        return await query
            .OrderBy(customer => customer.Name)
            .Select(customer => MapToDto(customer))
            .ToListAsync(cancellationToken);
    }

    public async Task<CustomerDto> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var customer = await _dbContext.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(
                customer => customer.Id == id,
                cancellationToken);

        if (customer is null)
        {
            throw new NotFoundException("Müştəri tapılmadı.");
        }

        return MapToDto(customer);
    }

    public async Task<CustomerDto> CreateAsync(
        CreateCustomerRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var customer = new Customer
        {
            Name = request.Name.Trim(),
            PhoneNumber = NormalizeOptional(request.PhoneNumber),
            Note = NormalizeOptional(request.Note),
            IsActive = true
        };

        _dbContext.Customers.Add(customer);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(customer);
    }

    public async Task<CustomerDto> UpdateAsync(
        Guid id,
        UpdateCustomerRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var customer = await _dbContext.Customers
            .FirstOrDefaultAsync(
                customer => customer.Id == id,
                cancellationToken);

        if (customer is null)
        {
            throw new NotFoundException("Müştəri tapılmadı.");
        }

        customer.Name = request.Name.Trim();
        customer.PhoneNumber = NormalizeOptional(request.PhoneNumber);
        customer.Note = NormalizeOptional(request.Note);
        customer.IsActive = request.IsActive!.Value;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(customer);
    }

    private static CustomerDto MapToDto(Customer customer)
    {
        return new CustomerDto
        {
            Id = customer.Id,
            Name = customer.Name,
            PhoneNumber = customer.PhoneNumber,
            Note = customer.Note,
            IsActive = customer.IsActive,
            CreatedAtUtc = customer.CreatedAtUtc,
            UpdatedAtUtc = customer.UpdatedAtUtc
        };
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}