using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GrandWall.Application.Abstractions.Orders;
using GrandWall.Application.Common.Files;
using GrandWall.Application.Features.Orders.Dtos;

namespace GrandWall.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/orders/{orderId:guid}/preparation")]
public sealed class OrderPreparationController : ControllerBase
{
    private const long MaximumRequestSizeBytes =
        12 * 1024 * 1024;

    private readonly IOrderPreparationService
        _orderPreparationService;

    public OrderPreparationController(
        IOrderPreparationService orderPreparationService)
    {
        _orderPreparationService = orderPreparationService;
    }

    [HttpPost("photos")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaximumRequestSizeBytes)]
    [RequestFormLimits(
        MultipartBodyLengthLimit = MaximumRequestSizeBytes)]
    public async Task<ActionResult<OrderPreparationPhotoDto>> UploadPhoto(
        Guid orderId,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        await using var stream = file.OpenReadStream();

        var request = new FileUploadRequest
        {
            Content = stream,
            FileName = file.FileName,
            ContentType = file.ContentType,
            FileSizeBytes = file.Length
        };

        var photo = await _orderPreparationService.UploadPhotoAsync(
            orderId,
            request,
            cancellationToken);

        return Ok(photo);
    }

    [HttpPost("complete")]
    public async Task<ActionResult<OrderDto>> CompletePreparation(
        Guid orderId,
        CancellationToken cancellationToken)
    {
        var order =
            await _orderPreparationService.CompletePreparationAsync(
                orderId,
                cancellationToken);

        return Ok(order);
    }
}