using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RamziWarehouse.Application.Abstractions.Files;
using RamziWarehouse.Application.Abstractions.Identity;
using RamziWarehouse.Application.Abstractions.Notifications;
using RamziWarehouse.Application.Abstractions.Orders;
using RamziWarehouse.Application.Common.Exceptions;
using RamziWarehouse.Application.Common.Files;
using RamziWarehouse.Application.Common.Notifications;
using RamziWarehouse.Application.Features.Orders.Dtos;
using RamziWarehouse.Domain.Entities;
using RamziWarehouse.Domain.Enums;
using RamziWarehouse.Infrastructure.Notifications.Telegram.Formatting;
using RamziWarehouse.Infrastructure.Persistence;

namespace RamziWarehouse.Infrastructure.Services;

public sealed class OrderPreparationService
    : IOrderPreparationService
{
    private const int MaximumPhotoCount = 10;

    private readonly AppDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IFileStorageService _fileStorageService;
    private readonly IOrderService _orderService;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<OrderPreparationService> _logger;
    private readonly ITelegramOutboxService _telegramOutboxService;

    public OrderPreparationService(
        AppDbContext dbContext,
        ICurrentUserService currentUserService,
        IFileStorageService fileStorageService,
        IOrderService orderService,
        ITelegramOutboxService telegramOutboxService,
        TimeProvider timeProvider,
        ILogger<OrderPreparationService> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _fileStorageService = fileStorageService;
        _orderService = orderService;
        _telegramOutboxService = telegramOutboxService;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public async Task<OrderPreparationPhotoDto> UploadPhotoAsync(
        Guid orderId,
        FileUploadRequest file,
        CancellationToken cancellationToken = default)
    {
        var order = await _dbContext.Orders
            .FirstOrDefaultAsync(
                order => order.Id == orderId,
                cancellationToken);

        if (order is null)
        {
            throw new NotFoundException("Sifariş tapılmadı.");
        }

        if (order.Status != OrderStatus.InPreparation)
        {
            throw new ConflictException(
                "Şəkil yalnız hazırlanmaqda olan sifarişə əlavə edilə bilər.");
        }

        var currentUserId = _currentUserService.UserId;

        if (!order.PreparedByUserId.HasValue ||
            order.PreparedByUserId.Value != currentUserId)
        {
            throw new ForbiddenException(
                "Bu sifarişi hazırlayan istifadəçi siz deyilsiniz.");
        }

        var currentPhotoCount = await _dbContext
            .Set<OrderPreparationPhoto>()
            .CountAsync(
                photo => photo.OrderId == order.Id,
                cancellationToken);

        if (currentPhotoCount >= MaximumPhotoCount)
        {
            throw new ConflictException(
                "Bir sifariş üçün maksimum 10 sübut şəkli əlavə edilə bilər.");
        }

        var storedFile = await _fileStorageService.UploadImageAsync(
            file,
            FileStorageFolders.OrderPreparation,
            cancellationToken);

        var photo = new OrderPreparationPhoto
        {
            OrderId = order.Id,
            CloudinaryPublicId = storedFile.PublicId,
            OriginalFileName = storedFile.OriginalFileName,
            ContentType = storedFile.ContentType,
            FileSizeBytes = storedFile.FileSizeBytes,
            UploadedByUserId = currentUserId
        };

        try
        {
            _dbContext.Set<OrderPreparationPhoto>().Add(photo);

            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception databaseException)
        {
            try
            {
                await _fileStorageService.DeleteImageAsync(
                    storedFile.PublicId,
                    CancellationToken.None);
            }
            catch (Exception cleanupException)
            {
                _logger.LogError(
                    cleanupException,
                    "Database əməliyyatı uğursuz olduqdan sonra " +
                    "Cloudinary şəkli silinə bilmədi. PublicId: {PublicId}",
                    storedFile.PublicId);
            }

            _logger.LogError(
                databaseException,
                "Sifariş hazırlama şəkli database-ə yazılmadı.");

            throw;
        }

        var uploadedByFullName = await _dbContext.Users
            .AsNoTracking()
            .Where(user => user.Id == currentUserId)
            .Select(user => user.FullName)
            .FirstAsync(cancellationToken);

        return new OrderPreparationPhotoDto
        {
            Id = photo.Id,
            OriginalFileName = photo.OriginalFileName,
            ContentType = photo.ContentType,
            FileSizeBytes = photo.FileSizeBytes,
            UploadedByUserId = photo.UploadedByUserId,
            UploadedByFullName = uploadedByFullName,
            UploadedAtUtc = photo.CreatedAtUtc
        };
    }

    public async Task<OrderDto> CompletePreparationAsync(
    Guid orderId,
    CancellationToken cancellationToken = default)
    {
        var order = await _dbContext.Orders
            .Include(currentOrder => currentOrder.Customer)
            .Include(currentOrder => currentOrder.Warehouse)
            .Include(currentOrder => currentOrder.Items)
            .Include(currentOrder =>
                currentOrder.PreparationPhotos)
            .Include(currentOrder =>
                currentOrder.PreparedByUser)
            .FirstOrDefaultAsync(
                currentOrder =>
                    currentOrder.Id == orderId,
                cancellationToken);

        if (order is null)
        {
            throw new NotFoundException(
                "Sifariş tapılmadı.");
        }

        if (order.Status != OrderStatus.InPreparation)
        {
            throw new ConflictException(
                "Yalnız hazırlanmaqda olan sifariş " +
                "tamamlana bilər.");
        }

        var currentUserId =
            _currentUserService.UserId;

        if (!order.PreparedByUserId.HasValue ||
            order.PreparedByUserId.Value != currentUserId)
        {
            throw new ForbiddenException(
                "Bu sifarişi hazırlayan istifadəçi " +
                "siz deyilsiniz.");
        }

        if (order.PreparationPhotos.Count == 0)
        {
            throw new ConflictException(
                "Sifarişi tamamlamaq üçün ən azı bir " +
                "sübut şəkli əlavə edilməlidir.");
        }

        var preparedByFullName =
            order.PreparedByUser?.FullName;

        if (string.IsNullOrWhiteSpace(
                preparedByFullName))
        {
            preparedByFullName = await _dbContext.Users
                .AsNoTracking()
                .Where(user =>
                    user.Id == currentUserId)
                .Select(user => user.FullName)
                .FirstOrDefaultAsync(
                    cancellationToken);
        }

        if (string.IsNullOrWhiteSpace(
                preparedByFullName))
        {
            preparedByFullName =
                "Naməlum istifadəçi";
        }

        var previousStatus = order.Status;

        var preparedAtUtc = _timeProvider
            .GetUtcNow()
            .UtcDateTime;

        order.CompletePreparation(
            preparedAtUtc);

        var history = new OrderStatusHistory
        {
            OrderId = order.Id,
            PreviousStatus = previousStatus,
            NewStatus = order.Status,
            ChangedByUserId = currentUserId,
            Note = "Sifarişin hazırlanması tamamlandı."
        };

        _dbContext
            .Set<OrderStatusHistory>()
            .Add(history);

        var telegramMessages =
            OrderPreparationCompletedTelegramMessageBuilder
                .Build(
                    order,
                    order.Items.ToList(),
                    order.Customer.Name,
                    order.Warehouse.Name,
                    preparedByFullName,
                    preparedAtUtc,
                    order.PreparationPhotos.Count);

        var telegramPhotos =
            order.PreparationPhotos
                .OrderBy(photo => photo.CreatedAtUtc)
                .Select(
                    photo =>
                        new TelegramOutboxPhotoRequest
                        {
                            CloudinaryPublicId =
                                photo.CloudinaryPublicId,

                            OriginalFileName =
                                photo.OriginalFileName,

                            ContentType =
                                photo.ContentType
                        })
                .ToList();

        for (
            var messageIndex = 0;
            messageIndex < telegramMessages.Count;
            messageIndex++)
        {
            var isLastMessage =
                messageIndex ==
                telegramMessages.Count - 1;

            IReadOnlyCollection<
                TelegramOutboxPhotoRequest>? photos =
                    isLastMessage
                        ? telegramPhotos
                        : null;

            await _telegramOutboxService.EnqueueAsync(
                TelegramChannel.Orders,
                telegramMessages[messageIndex],
                TelegramRelatedEntityTypes.OrderPreparation,
                order.Id,
                photos: photos,
                cancellationToken: cancellationToken);
        }

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return await _orderService.GetByIdAsync(
            order.Id,
            cancellationToken);
    }
}