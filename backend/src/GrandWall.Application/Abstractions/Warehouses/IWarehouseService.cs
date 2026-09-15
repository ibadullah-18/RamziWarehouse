using GrandWall.Application.Features.Warehouses.Dtos;

namespace GrandWall.Application.Abstractions.Warehouses;

public interface IWarehouseService
{
    Task<IReadOnlyList<WarehouseDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<WarehouseDto> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}