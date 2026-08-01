using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RamziWarehouse.Application.Abstractions.Warehouses;
using RamziWarehouse.Application.Features.Warehouses.Dtos;

namespace RamziWarehouse.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class WarehousesController : ControllerBase
{
    private readonly IWarehouseService _warehouseService;

    public WarehousesController(IWarehouseService warehouseService)
    {
        _warehouseService = warehouseService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<WarehouseDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var warehouses = await _warehouseService.GetAllAsync(
            cancellationToken);

        return Ok(warehouses);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WarehouseDto>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var warehouse = await _warehouseService.GetByIdAsync(
            id,
            cancellationToken);

        return Ok(warehouse);
    }
}