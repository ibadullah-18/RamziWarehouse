using Microsoft.EntityFrameworkCore;
using GrandWall.Application.Abstractions.Warehouses;
using GrandWall.Application.Common.Exceptions;
using GrandWall.Application.Features.Warehouses.Dtos;
using GrandWall.Infrastructure.Persistence;

namespace GrandWall.Infrastructure.Services;

public sealed class WarehouseService : IWarehouseService
{
    private readonly AppDbContext _dbContext;

    public WarehouseService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<WarehouseDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Warehouses
            .AsNoTracking()
            .OrderBy(warehouse => warehouse.Name)
            .Select(warehouse => new WarehouseDto
            {
                Id = warehouse.Id,
                Name = warehouse.Name,
                IsActive = warehouse.IsActive,
                CreatedAtUtc = warehouse.CreatedAtUtc,
                UpdatedAtUtc = warehouse.UpdatedAtUtc
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<WarehouseDto> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var warehouse = await _dbContext.Warehouses
            .AsNoTracking()
            .Where(warehouse => warehouse.Id == id)
            .Select(warehouse => new WarehouseDto
            {
                Id = warehouse.Id,
                Name = warehouse.Name,
                IsActive = warehouse.IsActive,
                CreatedAtUtc = warehouse.CreatedAtUtc,
                UpdatedAtUtc = warehouse.UpdatedAtUtc
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (warehouse is null)
        {
            throw new NotFoundException("Anbar tapılmadı.");
        }

        return warehouse;
    }
}