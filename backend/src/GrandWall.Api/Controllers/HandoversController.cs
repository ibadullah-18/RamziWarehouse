using GrandWall.Application.Features.Handovers;
using GrandWall.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GrandWall.Api.Controllers;

/// <summary>"Mal təhvil": delivery photos per customer, listed per day.</summary>
[ApiController, Authorize, Route("api/handovers")]
public sealed class HandoversController(HandoverService service) : ControllerBase
{
    /// <summary>Creates a handover with its photos in one request (multipart: files, customerId, note, operationId).</summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(110 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 110 * 1024 * 1024)]
    public async Task<ActionResult<HandoverDto>> Create(
        [FromForm] Guid operationId,
        [FromForm] Guid customerId,
        [FromForm] string? note,
        [FromForm] List<IFormFile> files,
        CancellationToken ct)
    {
        var streams = new List<Stream>();
        try
        {
            var uploads = new List<HandoverPhotoUpload>();
            foreach (var file in files ?? [])
            {
                var stream = file.OpenReadStream();
                streams.Add(stream);
                uploads.Add(new HandoverPhotoUpload
                {
                    Content = stream,
                    FileName = string.IsNullOrWhiteSpace(file.FileName) ? "handover.jpg" : file.FileName,
                    ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "image/jpeg" : file.ContentType,
                    Length = file.Length,
                });
            }
            var result = await service.CreateAsync(operationId, customerId, note, uploads, ct);
            return StatusCode(StatusCodes.Status201Created, result);
        }
        finally
        {
            foreach (var stream in streams) await stream.DisposeAsync();
        }
    }

    /// <summary>The day's list (default today). mine=true: only the signed-in user's own handovers.</summary>
    [HttpGet]
    public async Task<ActionResult<HandoverDayDto>> Day([FromQuery] DateOnly? date, [FromQuery] bool mine, CancellationToken ct)
        => Ok(await service.GetDayAsync(date, mine, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<HandoverDto>> Get(Guid id, CancellationToken ct)
        => Ok(await service.GetAsync(id, ct));

    [HttpGet("{id:guid}/photos/{photoId:guid}/file")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> Photo(Guid id, Guid photoId, [FromQuery] bool thumbnail, CancellationToken ct)
    {
        var file = await service.PhotoAsync(id, photoId, thumbnail, ct);
        return File(file.Content, file.ContentType, $"tehvil-{photoId:N}.jpg");
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<HandoverDto>> Update(Guid id, UpdateHandoverRequest request, CancellationToken ct)
        => Ok(await service.UpdateAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await service.DeleteAsync(id, ct);
        return NoContent();
    }
}
