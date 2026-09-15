using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GrandWall.Application.Abstractions.Orders;

namespace GrandWall.Api.Controllers;

[ApiController]
[Route("api/orders/{orderId:guid}")]
[Authorize]
public sealed class OrderPhotoFilesController : ControllerBase
{
    private readonly IOrderPhotoFileService
        _orderPhotoFileService;

    public OrderPhotoFilesController(
        IOrderPhotoFileService orderPhotoFileService)
    {
        _orderPhotoFileService = orderPhotoFileService;
    }

    [HttpGet(
        "preparation/photos/{photoId:guid}/file")]
    [ResponseCache(
        NoStore = true,
        Location = ResponseCacheLocation.None)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DownloadPreparationPhoto(
        Guid orderId,
        Guid photoId,
        CancellationToken cancellationToken)
    {
        var photoFile =
            await _orderPhotoFileService
                .DownloadPreparationPhotoAsync(
                    orderId,
                    photoId,
                    cancellationToken);

        return File(
            photoFile.Content,
            photoFile.ContentType,
            photoFile.FileName);
    }

    [HttpGet(
        "delivery/photos/{photoId:guid}/file")]
    [ResponseCache(
        NoStore = true,
        Location = ResponseCacheLocation.None)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DownloadDeliveryPhoto(
        Guid orderId,
        Guid photoId,
        CancellationToken cancellationToken)
    {
        var photoFile =
            await _orderPhotoFileService
                .DownloadDeliveryPhotoAsync(
                    orderId,
                    photoId,
                    cancellationToken);

        return File(
            photoFile.Content,
            photoFile.ContentType,
            photoFile.FileName);
    }

    [HttpDelete(
    "preparation/photos/{photoId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeletePreparationPhoto(
    Guid orderId,
    Guid photoId,
    CancellationToken cancellationToken)
    {
        await _orderPhotoFileService.DeletePreparationPhotoAsync(
            orderId,
            photoId,
            cancellationToken);

        return NoContent();
    }
}