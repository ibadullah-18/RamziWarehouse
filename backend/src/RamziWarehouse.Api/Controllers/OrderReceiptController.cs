using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RamziWarehouse.Application.Abstractions.Orders;
using RamziWarehouse.Application.Features.Orders.Dtos;

namespace RamziWarehouse.Api.Controllers;

[ApiController]
[Authorize(Policy = "ManagerOnly")]
[Route("api/orders/{orderId:guid}/receipt-data")]
public sealed class OrderReceiptController : ControllerBase
{
    private readonly IOrderReceiptService
        _orderReceiptService;

    public OrderReceiptController(
        IOrderReceiptService orderReceiptService)
    {
        _orderReceiptService = orderReceiptService;
    }

    [HttpGet]
    [ProducesResponseType(
        typeof(OrderReceiptDto),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status404NotFound)]
    [ProducesResponseType(
        StatusCodes.Status409Conflict)]
    public async Task<ActionResult<OrderReceiptDto>>
        GetReceiptData(
            Guid orderId,
            CancellationToken cancellationToken)
    {
        var receipt =
            await _orderReceiptService.GetReceiptAsync(
                orderId,
                cancellationToken);

        return Ok(receipt);
    }
}