using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RamziWarehouse.Api.Authorization;
using RamziWarehouse.Application.Abstractions.Orders;
using RamziWarehouse.Application.Common.Models;
using RamziWarehouse.Application.Features.Orders.Dtos;

namespace RamziWarehouse.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrdersController(
        IOrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpGet]
    public async Task<
        ActionResult<
            PagedResultDto<OrderListItemDto>>>
        GetAll(
            [FromQuery] OrderQueryDto query,
            CancellationToken cancellationToken)
    {
        var result =
            await _orderService.GetAllAsync(
                query,
                cancellationToken);

        return Ok(result);
    }

    [HttpGet("product-suggestions")]
    public async Task<
        ActionResult<
            IReadOnlyList<ProductSuggestionDto>>>
        GetProductSuggestions(
            [FromQuery] string? search,
            [FromQuery] int take = 10,
            CancellationToken cancellationToken = default)
    {
        var suggestions =
            await _orderService
                .GetProductSuggestionsAsync(
                    search,
                    take,
                    cancellationToken);

        return Ok(suggestions);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderDto>>
        GetById(
            Guid id,
            CancellationToken cancellationToken)
    {
        var order =
            await _orderService.GetByIdAsync(
                id,
                cancellationToken);

        return Ok(order);
    }

    [HttpPost]
    [Authorize(
        Policy = AuthorizationPolicies.ManagerOrAdmin)]
    public async Task<ActionResult<OrderDto>>
        Create(
            [FromBody]
            CreateOrderRequestDto request,
            CancellationToken cancellationToken)
    {
        var order =
            await _orderService.CreateAsync(
                request,
                cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new
            {
                id = order.Id
            },
            order);
    }

    [HttpPost(
        "{id:guid}/start-preparation")]
    public async Task<ActionResult<OrderDto>>
        StartPreparation(
            Guid id,
            CancellationToken cancellationToken)
    {
        var order =
            await _orderService
                .StartPreparationAsync(
                    id,
                    cancellationToken);

        return Ok(order);
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<ActionResult<OrderDto>>
        Cancel(
            Guid id,
            [FromBody]
            CancelOrderRequestDto request,
            CancellationToken cancellationToken)
    {
        var order =
            await _orderService.CancelAsync(
                id,
                request,
                cancellationToken);

        return Ok(order);
    }
}