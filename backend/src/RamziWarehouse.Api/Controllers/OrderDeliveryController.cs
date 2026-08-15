using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RamziWarehouse.Application.Abstractions.Orders;
using RamziWarehouse.Application.Common.Files;
using RamziWarehouse.Application.Features.Orders.Dtos;

namespace RamziWarehouse.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/orders/{orderId:guid}/delivery")]
public sealed class OrderDeliveryController : ControllerBase
{
    private const long MaximumRequestSizeBytes =
        12 * 1024 * 1024;

    private readonly IOrderDeliveryService
        _orderDeliveryService;

    public OrderDeliveryController(
        IOrderDeliveryService orderDeliveryService)
    {
        _orderDeliveryService =
            orderDeliveryService;
    }

    [HttpGet]
    [ProducesResponseType(
        typeof(OrderDeliveryDto),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderDeliveryDto>>
        GetDelivery(
            Guid orderId,
            CancellationToken cancellationToken)
    {
        var delivery =
            await _orderDeliveryService
                .GetByOrderIdAsync(
                    orderId,
                    cancellationToken);

        return Ok(delivery);
    }

    [HttpPost("photos")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaximumRequestSizeBytes)]
    [RequestFormLimits(
        MultipartBodyLengthLimit =
            MaximumRequestSizeBytes)]
    [ProducesResponseType(
        typeof(DeliveryPhotoDto),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status403Forbidden)]
    [ProducesResponseType(
        StatusCodes.Status404NotFound)]
    [ProducesResponseType(
        StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DeliveryPhotoDto>>
        UploadPhoto(
            Guid orderId,
            IFormFile file,
            CancellationToken cancellationToken)
    {
        await using var stream =
            file.OpenReadStream();

        var request = new FileUploadRequest
        {
            Content = stream,
            FileName = file.FileName,
            ContentType = file.ContentType,
            FileSizeBytes = file.Length
        };

        var photo =
            await _orderDeliveryService.UploadPhotoAsync(
                orderId,
                request,
                cancellationToken);

        return Ok(photo);
    }

    [HttpDelete("photos/{photoId:guid}")]
    [ProducesResponseType(
        StatusCodes.Status204NoContent)]
    [ProducesResponseType(
        StatusCodes.Status403Forbidden)]
    [ProducesResponseType(
        StatusCodes.Status404NotFound)]
    [ProducesResponseType(
        StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeletePhoto(
        Guid orderId,
        Guid photoId,
        CancellationToken cancellationToken)
    {
        await _orderDeliveryService.DeletePhotoAsync(
            orderId,
            photoId,
            cancellationToken);

        return NoContent();
    }

    [HttpPost("complete")]
    [ProducesResponseType(
        typeof(OrderDto),
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status403Forbidden)]
    [ProducesResponseType(
        StatusCodes.Status404NotFound)]
    [ProducesResponseType(
        StatusCodes.Status409Conflict)]
    public async Task<ActionResult<OrderDto>>
        CompleteDelivery(
            Guid orderId,
            [FromBody]
            CompleteOrderDeliveryRequestDto request,
            CancellationToken cancellationToken)
    {
        var order =
            await _orderDeliveryService.CompleteAsync(
                orderId,
                request,
                cancellationToken);

        return Ok(order);
    }
}