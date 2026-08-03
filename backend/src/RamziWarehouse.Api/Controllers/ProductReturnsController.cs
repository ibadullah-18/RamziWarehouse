using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RamziWarehouse.Application.Abstractions.ProductReturns;
using RamziWarehouse.Application.Features.ProductReturns.Dtos;
using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Api.Controllers;

[ApiController]
[Route("api/product-returns")]
[Authorize]
public sealed class ProductReturnsController : ControllerBase
{
    private readonly IProductReturnService _productReturnService;

    public ProductReturnsController(
        IProductReturnService productReturnService)
    {
        _productReturnService = productReturnService;
    }

    [HttpGet]
    [ProducesResponseType(
        typeof(ProductReturnListDto),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<ProductReturnListDto>> GetAll(
        [FromQuery] ProductReturnFilterDto filter,
        CancellationToken cancellationToken)
    {
        var result = await _productReturnService.GetAllAsync(
            filter,
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("{productReturnId:guid}")]
    [ProducesResponseType(
        typeof(ProductReturnDto),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductReturnDto>> GetById(
        Guid productReturnId,
        CancellationToken cancellationToken)
    {
        var result = await _productReturnService.GetByIdAsync(
            productReturnId,
            cancellationToken);

        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(
        typeof(ProductReturnDto),
        StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductReturnDto>> Create(
        [FromBody] CreateProductReturnDto request,
        CancellationToken cancellationToken)
    {
        var result = await _productReturnService.CreateAsync(
            request,
            cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new
            {
                productReturnId = result.Id
            },
            result);
    }

    [HttpPost("{productReturnId:guid}/complete")]
    [Authorize(Roles = nameof(UserRole.Manager))]
    [ProducesResponseType(
        typeof(ProductReturnDto),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductReturnDto>> Complete(
        Guid productReturnId,
        [FromBody] ProcessProductReturnDto request,
        CancellationToken cancellationToken)
    {
        var result = await _productReturnService.CompleteAsync(
            productReturnId,
            request,
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("{productReturnId:guid}/cancel")]
    [Authorize(Roles = nameof(UserRole.Manager))]
    [ProducesResponseType(
        typeof(ProductReturnDto),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductReturnDto>> Cancel(
        Guid productReturnId,
        [FromBody] ProcessProductReturnDto request,
        CancellationToken cancellationToken)
    {
        var result = await _productReturnService.CancelAsync(
            productReturnId,
            request,
            cancellationToken);

        return Ok(result);
    }
}