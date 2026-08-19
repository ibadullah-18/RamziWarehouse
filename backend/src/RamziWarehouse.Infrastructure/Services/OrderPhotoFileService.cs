using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RamziWarehouse.Application.Abstractions.Files;
using RamziWarehouse.Application.Abstractions.Identity;
using RamziWarehouse.Application.Abstractions.Orders;
using RamziWarehouse.Application.Common.Exceptions;
using RamziWarehouse.Application.Common.Files;
using RamziWarehouse.Domain.Enums;
using RamziWarehouse.Infrastructure.Persistence;

namespace RamziWarehouse.Infrastructure.Services;

public sealed class OrderPhotoFileService
    : IOrderPhotoFileService
{
    private readonly AppDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IFileStorageService _fileStorageService;
    private readonly ILogger<OrderPhotoFileService> _logger;

    public OrderPhotoFileService(
        AppDbContext dbContext,
        ICurrentUserService currentUserService,
        IFileStorageService fileStorageService,
        ILogger<OrderPhotoFileService> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _fileStorageService = fileStorageService;
        _logger = logger;
    }

    public async Task<FileDownloadDto> DownloadPreparationPhotoAsync(
        Guid orderId,
        Guid photoId,
        CancellationToken cancellationToken = default)
    {
        EnsureAuthenticated();

        var photo = await _dbContext.OrderPreparationPhotos
            .AsNoTracking()
            .FirstOrDefaultAsync(
                currentPhoto =>
                    currentPhoto.Id == photoId &&
                    currentPhoto.OrderId == orderId,
                cancellationToken);

        if (photo is null)
        {
            throw new NotFoundException(
                "Sifarişin hazırlama şəkli tapılmadı.");
        }

        return await DownloadFileAsync(
            photo.CloudinaryPublicId,
            photo.OriginalFileName,
            cancellationToken);
    }

    public async Task<FileDownloadDto> DownloadDeliveryPhotoAsync(
        Guid orderId,
        Guid photoId,
        CancellationToken cancellationToken = default)
    {
        EnsureAuthenticated();

        var photo = await _dbContext.DeliveryPhotos
            .AsNoTracking()
            .Include(currentPhoto =>
                currentPhoto.OrderDelivery)
            .FirstOrDefaultAsync(
                currentPhoto =>
                    currentPhoto.Id == photoId &&
                    currentPhoto.OrderDelivery.OrderId == orderId,
                cancellationToken);

        if (photo is null)
        {
            throw new NotFoundException(
                "Sifarişin təhvil şəkli tapılmadı.");
        }

        return await DownloadFileAsync(
            photo.CloudinaryPublicId,
            photo.OriginalFileName,
            cancellationToken);
    }

    private async Task<FileDownloadDto> DownloadFileAsync(
        string publicId,
        string originalFileName,
        CancellationToken cancellationToken)
    {
        StoredFileContentDto storedFile;

        try
        {
            storedFile =
                await _fileStorageService.DownloadImageAsync(
                    publicId,
                    cancellationToken);
        }
        catch (FileNotFoundException)
        {
            throw new NotFoundException(
                "Şəkil Cloudinary-də tapılmadı.");
        }

        return new FileDownloadDto
        {
            Content = storedFile.Content,
            ContentType = storedFile.ContentType,
            FileName = originalFileName
        };
    }

    private void EnsureAuthenticated()
    {
        if (!_currentUserService.IsAuthenticated)
        {
            throw new ForbiddenException(
                "Şəkli açmaq üçün sistemə daxil olmalısınız.");
        }
    }

    public async Task DeletePreparationPhotoAsync(
    Guid orderId,
    Guid photoId,
    CancellationToken cancellationToken = default)
    {
        EnsureAuthenticated();

        var photo = await _dbContext.OrderPreparationPhotos
            .Include(currentPhoto => currentPhoto.Order)
            .FirstOrDefaultAsync(
                currentPhoto =>
                    currentPhoto.Id == photoId &&
                    currentPhoto.OrderId == orderId,
                cancellationToken);

        if (photo is null)
        {
            throw new NotFoundException(
                "Sifarişin hazırlama şəkli tapılmadı.");
        }

        if (photo.Order.Status != OrderStatus.InPreparation)
        {
            throw new ConflictException(
                "Hazırlama şəkli yalnız sifariş hazırlanarkən silinə bilər.");
        }

        var isUploader =
            photo.UploadedByUserId == _currentUserService.UserId;

        var isManager =
            _currentUserService.Role
                .CanManageOperations();

        if (!isUploader && !isManager)
        {
            throw new ForbiddenException(
                "Bu şəkli yalnız yükləyən istifadəçi " +
                "və ya menecer silə bilər.");
        }

        _dbContext.OrderPreparationPhotos.Remove(photo);

        await _dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            await _fileStorageService.DeleteImageAsync(
                photo.CloudinaryPublicId,
                cancellationToken);
        }
        catch (Exception deletionException)
        {
            try
            {
                _dbContext.OrderPreparationPhotos.Add(photo);

                await _dbContext.SaveChangesAsync(
                    CancellationToken.None);
            }
            catch (Exception restorationException)
            {
                _logger.LogCritical(
                    restorationException,
                    "Hazırlama şəkli bazaya geri qaytarıla bilmədi. " +
                    "OrderId: {OrderId}, PhotoId: {PhotoId}, " +
                    "PublicId: {PublicId}",
                    orderId,
                    photo.Id,
                    photo.CloudinaryPublicId);
            }

            _logger.LogError(
                deletionException,
                "Hazırlama şəkli Cloudinary-dən silinə bilmədi. " +
                "OrderId: {OrderId}, PhotoId: {PhotoId}, " +
                "PublicId: {PublicId}",
                orderId,
                photo.Id,
                photo.CloudinaryPublicId);

            throw;
        }
    }
}