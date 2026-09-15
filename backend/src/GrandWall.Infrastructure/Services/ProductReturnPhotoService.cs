using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GrandWall.Application.Abstractions.Files;
using GrandWall.Application.Abstractions.Identity;
using GrandWall.Application.Abstractions.ProductReturns;
using GrandWall.Application.Common.Exceptions;
using GrandWall.Application.Common.Files;
using GrandWall.Application.Features.ProductReturns.Dtos;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Persistence;

namespace GrandWall.Infrastructure.Services;

public sealed class ProductReturnPhotoService
    : IProductReturnPhotoService
{
    private readonly AppDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IFileStorageService _fileStorageService;
    private readonly ILogger<ProductReturnPhotoService> _logger;

    public ProductReturnPhotoService(
        AppDbContext dbContext,
        ICurrentUserService currentUserService,
        IFileStorageService fileStorageService,
        ILogger<ProductReturnPhotoService> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _fileStorageService = fileStorageService;
        _logger = logger;
    }

    public async Task<ProductReturnPhotoDto> UploadPhotoAsync(
        Guid productReturnId,
        FileUploadRequest file,
        CancellationToken cancellationToken = default)
    {
        if (!_currentUserService.IsAuthenticated)
        {
            throw new ForbiddenException(
                "Şəkil yükləmək üçün sistemə daxil olmalısınız.");
        }

        var productReturn = await _dbContext.ProductReturns
            .FirstOrDefaultAsync(
                currentReturn =>
                    currentReturn.Id == productReturnId,
                cancellationToken);

        if (productReturn is null)
        {
            throw new NotFoundException(
                "Vazvrad məlumatı tapılmadı.");
        }

        if (productReturn.Status != ReturnStatus.Pending)
        {
            throw new ConflictException(
                "Yalnız gözləmədə olan vazvrada şəkil əlavə edilə bilər.");
        }

        var folder =
            $"{FileStorageFolders.ProductReturn}/" +
            $"{productReturn.Id:N}";

        var storedFile =
            await _fileStorageService.UploadImageAsync(
                file,
                folder,
                cancellationToken);

        var photo = new ProductReturnPhoto
        {
            ProductReturnId = productReturn.Id,
            CloudinaryPublicId = storedFile.PublicId,
            OriginalFileName = storedFile.OriginalFileName,
            ContentType = storedFile.ContentType,
            FileSizeBytes = storedFile.FileSizeBytes,
            UploadedByUserId = _currentUserService.UserId
        };

        try
        {
            _dbContext.ProductReturnPhotos.Add(photo);

            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            try
            {
                await _fileStorageService.DeleteImageAsync(
                    storedFile.PublicId,
                    CancellationToken.None);
            }
            catch (Exception deletionException)
            {
                _logger.LogError(
                    deletionException,
                    "Bazaya yazılmayan vazvrad şəkli " +
                    "Cloudinary-dən silinə bilmədi. PublicId: {PublicId}",
                    storedFile.PublicId);
            }

            throw;
        }

        return new ProductReturnPhotoDto
        {
            Id = photo.Id,
            OriginalFileName = photo.OriginalFileName,
            ContentType = photo.ContentType,
            FileSizeBytes = photo.FileSizeBytes,
            UploadedByUserId = photo.UploadedByUserId,
            UploadedByFullName = _currentUserService.FullName,
            CreatedAtUtc = photo.CreatedAtUtc
        };
    }

    public async Task<FileDownloadDto> DownloadPhotoAsync(
    Guid productReturnId,
    Guid photoId,
    CancellationToken cancellationToken = default)
    {
        if (!_currentUserService.IsAuthenticated)
        {
            throw new ForbiddenException(
                "Şəkli açmaq üçün sistemə daxil olmalısınız.");
        }

        var photo = await _dbContext.ProductReturnPhotos
            .AsNoTracking()
            .FirstOrDefaultAsync(
                currentPhoto =>
                    currentPhoto.Id == photoId &&
                    currentPhoto.ProductReturnId == productReturnId,
                cancellationToken);

        if (photo is null)
        {
            throw new NotFoundException(
                "Vazvrad şəkli tapılmadı.");
        }

        StoredFileContentDto storedFile;

        try
        {
            storedFile =
                await _fileStorageService.DownloadImageAsync(
                    photo.CloudinaryPublicId,
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
            FileName = photo.OriginalFileName
        };
    }

    public async Task DeletePhotoAsync(
    Guid productReturnId,
    Guid photoId,
    CancellationToken cancellationToken = default)
    {
        if (!_currentUserService.IsAuthenticated)
        {
            throw new ForbiddenException(
                "Şəkli silmək üçün sistemə daxil olmalısınız.");
        }

        var photo = await _dbContext.ProductReturnPhotos
            .Include(currentPhoto => currentPhoto.ProductReturn)
            .FirstOrDefaultAsync(
                currentPhoto =>
                    currentPhoto.Id == photoId &&
                    currentPhoto.ProductReturnId == productReturnId,
                cancellationToken);

        if (photo is null)
        {
            throw new NotFoundException(
                "Vazvrad şəkli tapılmadı.");
        }

        if (photo.ProductReturn.Status != ReturnStatus.Pending)
        {
            throw new ConflictException(
                "Yalnız gözləmədə olan vazvradın şəkli silinə bilər.");
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

        _dbContext.ProductReturnPhotos.Remove(photo);

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
                _dbContext.ProductReturnPhotos.Add(photo);

                await _dbContext.SaveChangesAsync(
                    CancellationToken.None);
            }
            catch (Exception restorationException)
            {
                _logger.LogCritical(
                    restorationException,
                    "Cloudinary silinməsi uğursuz oldu və " +
                    "vazvrad şəkil qeydi bazaya geri qaytarıla bilmədi. " +
                    "PhotoId: {PhotoId}, PublicId: {PublicId}",
                    photo.Id,
                    photo.CloudinaryPublicId);
            }

            _logger.LogError(
                deletionException,
                "Vazvrad şəkli Cloudinary-dən silinə bilmədi. " +
                "PhotoId: {PhotoId}, PublicId: {PublicId}",
                photo.Id,
                photo.CloudinaryPublicId);

            throw;
        }
    }
}