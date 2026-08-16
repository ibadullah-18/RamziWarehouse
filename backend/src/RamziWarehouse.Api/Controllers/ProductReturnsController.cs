using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RamziWarehouse.Application.Abstractions.ProductReturns;
using RamziWarehouse.Application.Common.Files;
using RamziWarehouse.Application.Features.ProductReturns.Dtos;
using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Api.Controllers;

[ApiController]
[Route("api/product-returns")]
[Authorize]
public sealed class ProductReturnsController : ControllerBase
{
    private readonly IProductReturnService _productReturnService;
    private readonly IProductReturnPhotoService
    _productReturnPhotoService;
    private readonly IProductReturnSubmissionService
    _productReturnSubmissionService;

    public ProductReturnsController(
        IProductReturnService productReturnService,
        IProductReturnPhotoService productReturnPhotoService,
        IProductReturnSubmissionService
            productReturnSubmissionService)
    {
        _productReturnService = productReturnService;
        _productReturnPhotoService = productReturnPhotoService;
        _productReturnSubmissionService =
            productReturnSubmissionService;
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

    [HttpPost("{productReturnId:guid}/photos")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(12 * 1024 * 1024)]
    [ProducesResponseType(
     typeof(ProductReturnPhotoDto),
     StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductReturnPhotoDto>> UploadPhoto(
     Guid productReturnId,
     IFormFile file,
     CancellationToken cancellationToken)
    {
        await using var fileStream = file.OpenReadStream();

        var uploadRequest = new FileUploadRequest
        {
            Content = fileStream,
            FileName = file.FileName,
            ContentType = file.ContentType,
            FileSizeBytes = file.Length
        };

        var result = await _productReturnPhotoService.UploadPhotoAsync(
            productReturnId,
            uploadRequest,
            cancellationToken);

        return StatusCode(
            StatusCodes.Status201Created,
            result);
    }

    [HttpGet(
    "{productReturnId:guid}/photos/{photoId:guid}/file")]
    [ResponseCache(
    NoStore = true,
    Location = ResponseCacheLocation.None)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DownloadPhoto(
    Guid productReturnId,
    Guid photoId,
    CancellationToken cancellationToken)
    {
        var photoFile =
            await _productReturnPhotoService.DownloadPhotoAsync(
                productReturnId,
                photoId,
                cancellationToken);

        return File(
            photoFile.Content,
            photoFile.ContentType,
            photoFile.FileName);
    }

    [HttpDelete(
    "{productReturnId:guid}/photos/{photoId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeletePhoto(
    Guid productReturnId,
    Guid photoId,
    CancellationToken cancellationToken)
    {
        await _productReturnPhotoService.DeletePhotoAsync(
            productReturnId,
            photoId,
            cancellationToken);

        return NoContent();
    }

    [HttpPost("{productReturnId:guid}/submit")]
    [ProducesResponseType(
    typeof(ProductReturnDto),
    StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductReturnDto>> Submit(
    Guid productReturnId,
    CancellationToken cancellationToken)
    {
        var result =
            await _productReturnSubmissionService.SubmitAsync(
                productReturnId,
                cancellationToken);

        return Ok(result);
    }
}