using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GrandWall.Application.Abstractions.Files;
using GrandWall.Application.Abstractions.Identity;
using GrandWall.Application.Abstractions.Notifications;
using GrandWall.Application.Abstractions.ProductReturns;
using GrandWall.Application.Common.Notifications;
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
    private readonly ITelegramOutboxService _telegramOutboxService;

    public ProductReturnPhotoService(
        AppDbContext dbContext,
        ICurrentUserService currentUserService,
        IFileStorageService fileStorageService,
        ILogger<ProductReturnPhotoService> logger,
        ITelegramOutboxService telegramOutboxService)
    {
        _telegramOutboxService = telegramOutboxService;
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
            .Include(currentReturn => currentReturn.Customer)
            .Include(currentReturn => currentReturn.Items)
            .FirstOrDefaultAsync(
                currentReturn =>
                    currentReturn.Id == productReturnId,
                cancellationToken);

        if (productReturn is null || productReturn.IsDeleted)
        {
            throw new NotFoundException(
                "Vazvrad məlumatı tapılmadı.");
        }

        if(file.OperationId==Guid.Empty)throw new ConflictException("Şəkil əməliyyatının identifikatoru düzgün deyil.");
        if(file.OperationId.HasValue){
            var existing=await _dbContext.ProductReturnPhotos.AsNoTracking().Include(p=>p.UploadedByUser).FirstOrDefaultAsync(p=>p.ProductReturnId==productReturnId&&p.UploadOperationId==file.OperationId,cancellationToken);
            if(existing!=null){
                if(existing.UploadedByUserId!=_currentUserService.UserId||existing.OriginalFileName!=file.FileName)throw new ConflictException("Şəkil əməliyyatı artıq istifadə olunub.");
                return new ProductReturnPhotoDto{Id=existing.Id,OriginalFileName=existing.OriginalFileName,ContentType=existing.ContentType,FileSizeBytes=existing.FileSizeBytes,UploadedByUserId=existing.UploadedByUserId,UploadedByFullName=existing.UploadedByUser.FullName,CreatedAtUtc=existing.CreatedAtUtc};
            }
        }
        if (productReturn.Status is not (ReturnStatus.Pending or ReturnStatus.Submitted))
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
            UploadOperationId=file.OperationId,
            ProductReturnId = productReturn.Id,
            CloudinaryPublicId = storedFile.PublicId,
            OriginalFileName = storedFile.OriginalFileName,
            ContentType = storedFile.ContentType,
            FileSizeBytes = storedFile.FileSizeBytes,
            UploadedByUserId = _currentUserService.UserId
        };

        try
        {
            productReturn.Revision=Guid.NewGuid();
            _dbContext.ProductReturnStatusHistories.Add(new ProductReturnStatusHistory{ProductReturnId=productReturn.Id,PreviousStatus=productReturn.Status,NewStatus=productReturn.Status,ChangedByUserId=_currentUserService.UserId,Note=$"Şəkil əlavə edildi: {photo.OriginalFileName}"});
            _dbContext.ProductReturnPhotos.Add(photo);

            // Photos added after the return went to the manager are sent to Telegram one by one,
            // because the submission message could not contain them yet.
            if (productReturn.Status == ReturnStatus.Submitted)
            {
                await _telegramOutboxService.EnqueueAsync(
                    TelegramChannel.Returns,
                    $"📷 Vazvrad şəkli{Environment.NewLine}Müştəri: {productReturn.Customer.Name}{Environment.NewLine}" +
                    string.Join(Environment.NewLine, productReturn.Items.Take(5).Select(item => $"Kod: {item.ProductCode} | Partiya: {item.BatchNumber}")),
                    TelegramRelatedEntityTypes.ProductReturn,
                    productReturn.Id,
                    new[]
                    {
                        new TelegramOutboxPhotoRequest
                        {
                            CloudinaryPublicId = storedFile.PublicId,
                            OriginalFileName = storedFile.OriginalFileName,
                            ContentType = storedFile.ContentType
                        }
                    },
                    cancellationToken);
            }

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

            if(file.OperationId.HasValue){
                _dbContext.Entry(photo).State=EntityState.Detached;
                var existing=await _dbContext.ProductReturnPhotos.AsNoTracking().Include(p=>p.UploadedByUser).FirstOrDefaultAsync(p=>p.ProductReturnId==productReturnId&&p.UploadOperationId==file.OperationId,CancellationToken.None);
                if(existing!=null&&existing.UploadedByUserId==_currentUserService.UserId&&existing.OriginalFileName==file.FileName)
                    return new ProductReturnPhotoDto{Id=existing.Id,OriginalFileName=existing.OriginalFileName,ContentType=existing.ContentType,FileSizeBytes=existing.FileSizeBytes,UploadedByUserId=existing.UploadedByUserId,UploadedByFullName=existing.UploadedByUser.FullName,CreatedAtUtc=existing.CreatedAtUtc};
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
        CancellationToken cancellationToken = default, bool thumbnail = false)
    {
        if (!_currentUserService.IsAuthenticated)
        {
            throw new ForbiddenException(
                "Şəkli açmaq üçün sistemə daxil olmalısınız.");
        }

        var photo = await _dbContext.ProductReturnPhotos
            .AsNoTracking()
            .Include(currentPhoto => currentPhoto.ProductReturn)
            .FirstOrDefaultAsync(
                currentPhoto =>
                    currentPhoto.Id == photoId &&
                    currentPhoto.ProductReturnId == productReturnId,
                cancellationToken);

        if (photo is null || photo.ProductReturn.IsDeleted)
        {
            throw new NotFoundException(
                "Vazvrad şəkli tapılmadı.");
        }

        StoredFileContentDto storedFile;

        try
        {
            storedFile =
                await (thumbnail ? _fileStorageService.DownloadThumbnailAsync(
                    photo.CloudinaryPublicId,cancellationToken) : _fileStorageService.DownloadImageAsync(
                    photo.CloudinaryPublicId,
                    cancellationToken));
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

        if (photo is null || photo.ProductReturn.IsDeleted)
        {
            throw new NotFoundException(
                "Vazvrad şəkli tapılmadı.");
        }

        if (photo.ProductReturn.Status is not (ReturnStatus.Pending or ReturnStatus.Submitted))
        {
            throw new ConflictException(
                "Yalnız gözləmədə olan vazvradın şəkli silinə bilər.");
        }

        photo.ProductReturn.Revision=Guid.NewGuid();
        _dbContext.ProductReturnStatusHistories.Add(new ProductReturnStatusHistory{ProductReturnId=productReturnId,PreviousStatus=photo.ProductReturn.Status,NewStatus=photo.ProductReturn.Status,ChangedByUserId=_currentUserService.UserId,Note=$"Şəkil silindi: {photo.OriginalFileName}"});
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
