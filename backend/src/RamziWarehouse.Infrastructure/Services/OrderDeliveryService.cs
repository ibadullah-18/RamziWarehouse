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

public sealed class OrderDeliveryService
    : IOrderDeliveryService
{
    private const int MaximumPhotoCount = 10;

    private readonly AppDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IFileStorageService _fileStorageService;
    private readonly IOrderService _orderService;
    private readonly ITelegramOutboxService _telegramOutboxService;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<OrderDeliveryService> _logger;

    public OrderDeliveryService(
        AppDbContext dbContext,
        ICurrentUserService currentUserService,
        IFileStorageService fileStorageService,
        IOrderService orderService,
        ITelegramOutboxService telegramOutboxService,
        TimeProvider timeProvider,
        ILogger<OrderDeliveryService> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _fileStorageService = fileStorageService;
        _orderService = orderService;
        _telegramOutboxService = telegramOutboxService;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public async Task<OrderDeliveryDto> GetByOrderIdAsync(
        Guid orderId,
        CancellationToken cancellationToken = default)
    {
        var delivery = await _dbContext.OrderDeliveries
            .AsNoTracking()
            .Include(currentDelivery =>
                currentDelivery.DeliveredByUser)
            .Include(currentDelivery =>
                currentDelivery.Photos)
            .ThenInclude(photo => photo.UploadedByUser)
            .FirstOrDefaultAsync(
                currentDelivery =>
                    currentDelivery.OrderId == orderId,
                cancellationToken);

        if (delivery is null)
        {
            throw new NotFoundException(
                "Bu sifariş üçün təhvil prosesi başlamayıb.");
        }

        return MapDelivery(delivery);
    }

    public async Task<DeliveryPhotoDto> UploadPhotoAsync(
        Guid orderId,
        FileUploadRequest file,
        CancellationToken cancellationToken = default)
    {
        var order = await _dbContext.Orders
            .Include(currentOrder => currentOrder.Delivery)
            .ThenInclude(delivery => delivery!.Photos)
            .FirstOrDefaultAsync(
                currentOrder =>
                    currentOrder.Id == orderId,
                cancellationToken);

        if (order is null)
        {
            throw new NotFoundException(
                "Sifariş tapılmadı.");
        }

        if (order.Status != OrderStatus.ReadyForDelivery)
        {
            throw new ConflictException(
                "Təhvil şəkli yalnız təhvilə hazır " +
                "sifarişə əlavə edilə bilər.");
        }

        var currentUserId =
            _currentUserService.UserId;

        var delivery = order.Delivery;

        if (delivery is null)
        {
            delivery = new OrderDelivery
            {
                OrderId = order.Id,
                DeliveredByUserId = currentUserId,
                StartedAtUtc = _timeProvider
                    .GetUtcNow()
                    .UtcDateTime
            };

            order.Delivery = delivery;
            _dbContext.OrderDeliveries.Add(delivery);
        }
        else
        {
            if (delivery.DeliveredAtUtc.HasValue)
            {
                throw new ConflictException(
                    "Bu sifariş artıq təhvil verilib.");
            }

            if (delivery.DeliveredByUserId !=
                currentUserId)
            {
                throw new ForbiddenException(
                    "Bu təhvil prosesini başqa istifadəçi başladıb.");
            }
        }

        if (delivery.Photos.Count >= MaximumPhotoCount)
        {
            throw new ConflictException(
                "Bir təhvil üçün maksimum 10 sübut " +
                "şəkli əlavə edilə bilər.");
        }

        var storedFile =
            await _fileStorageService.UploadImageAsync(
                file,
                FileStorageFolders.OrderDelivery,
                cancellationToken);

        var photo = new DeliveryPhoto
        {
            OrderDeliveryId = delivery.Id,
            CloudinaryPublicId = storedFile.PublicId,
            OriginalFileName =
                storedFile.OriginalFileName,

            ContentType = storedFile.ContentType,
            FileSizeBytes = storedFile.FileSizeBytes,
            UploadedByUserId = currentUserId
        };

        try
        {
            _dbContext.DeliveryPhotos.Add(photo);

            await _dbContext.SaveChangesAsync(
                cancellationToken);
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
                    "Database xətasından sonra təhvil şəkli " +
                    "Cloudinary-dən silinmədi. PublicId: {PublicId}",
                    storedFile.PublicId);
            }

            _logger.LogError(
                databaseException,
                "Təhvil şəkli database-ə yazılmadı.");

            throw;
        }

        var uploadedByFullName =
            await _dbContext.Users
                .AsNoTracking()
                .Where(user =>
                    user.Id == currentUserId)
                .Select(user => user.FullName)
                .FirstAsync(cancellationToken);

        return new DeliveryPhotoDto
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

    public async Task DeletePhotoAsync(
        Guid orderId,
        Guid photoId,
        CancellationToken cancellationToken = default)
    {
        var photo = await _dbContext.DeliveryPhotos
            .Include(currentPhoto =>
                currentPhoto.OrderDelivery)
            .ThenInclude(delivery => delivery.Order)
            .FirstOrDefaultAsync(
                currentPhoto =>
                    currentPhoto.Id == photoId &&
                    currentPhoto.OrderDelivery.OrderId ==
                        orderId,
                cancellationToken);

        if (photo is null)
        {
            throw new NotFoundException(
                "Təhvil şəkli tapılmadı.");
        }

        if (photo.OrderDelivery.Order.Status !=
            OrderStatus.ReadyForDelivery)
        {
            throw new ConflictException(
                "Təhvil şəkli yalnız təhvil " +
                "tamamlanmamışdan əvvəl silinə bilər.");
        }

        if (photo.OrderDelivery.DeliveredAtUtc.HasValue)
        {
            throw new ConflictException(
                "Tamamlanmış təhvilin şəkli silinə bilməz.");
        }

        var currentUserId =
            _currentUserService.UserId;

        var isDeliveryOwner =
            photo.OrderDelivery.DeliveredByUserId ==
                currentUserId;

        var isUploader =
            photo.UploadedByUserId == currentUserId;

        var isManager =
            _currentUserService.Role
                .CanManageOperations();

        if (!isDeliveryOwner &&
            !isUploader &&
            !isManager)
        {
            throw new ForbiddenException(
                "Bu təhvil şəklini silmək icazəniz yoxdur.");
        }

        _dbContext.DeliveryPhotos.Remove(photo);

        await _dbContext.SaveChangesAsync(
            cancellationToken);

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
                _dbContext.DeliveryPhotos.Add(photo);

                await _dbContext.SaveChangesAsync(
                    CancellationToken.None);
            }
            catch (Exception restorationException)
            {
                _logger.LogCritical(
                    restorationException,
                    "Təhvil şəkli database-ə geri qaytarılmadı. " +
                    "OrderId: {OrderId}, PhotoId: {PhotoId}",
                    orderId,
                    photoId);
            }

            _logger.LogError(
                deletionException,
                "Təhvil şəkli Cloudinary-dən silinmədi. " +
                "OrderId: {OrderId}, PhotoId: {PhotoId}",
                orderId,
                photoId);

            throw;
        }
    }

    public async Task<OrderDto> CompleteAsync(
        Guid orderId,
        CompleteOrderDeliveryRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var order = await _dbContext.Orders
            .Include(currentOrder => currentOrder.Customer)
            .Include(currentOrder => currentOrder.Warehouse)
            .Include(currentOrder => currentOrder.Items)
            .Include(currentOrder => currentOrder.Delivery)
            .ThenInclude(delivery => delivery!.Photos)
            .Include(currentOrder => currentOrder.Delivery)
            .ThenInclude(delivery =>
                delivery!.DeliveredByUser)
            .FirstOrDefaultAsync(
                currentOrder =>
                    currentOrder.Id == orderId,
                cancellationToken);

        if (order is null)
        {
            throw new NotFoundException(
                "Sifariş tapılmadı.");
        }

        if (order.Status != OrderStatus.ReadyForDelivery)
        {
            throw new ConflictException(
                "Yalnız təhvilə hazır sifariş " +
                "təhvil verilə bilər.");
        }

        var delivery = order.Delivery;

        if (delivery is null)
        {
            throw new ConflictException(
                "Əvvəlcə təhvil sübut şəkli əlavə edilməlidir.");
        }

        var currentUserId =
            _currentUserService.UserId;

        if (delivery.DeliveredByUserId != currentUserId)
        {
            throw new ForbiddenException(
                "Bu təhvil prosesini başlayan istifadəçi siz deyilsiniz.");
        }

        if (delivery.DeliveredAtUtc.HasValue)
        {
            throw new ConflictException(
                "Bu sifariş artıq təhvil verilib.");
        }

        if (delivery.Photos.Count == 0)
        {
            throw new ConflictException(
                "Təhvili tamamlamaq üçün ən azı bir " +
                "sübut şəkli əlavə edilməlidir.");
        }

        var deliveredAtUtc =
            _timeProvider.GetUtcNow().UtcDateTime;

        delivery.Complete(
            deliveredAtUtc,
            request.Note);

        var previousStatus = order.Status;

        order.MarkAsDelivered(deliveredAtUtc);

        var history = new OrderStatusHistory
        {
            OrderId = order.Id,
            PreviousStatus = previousStatus,
            NewStatus = order.Status,
            ChangedByUserId = currentUserId,
            Note = "Sifariş təhvil verildi."
        };

        _dbContext.OrderStatusHistories.Add(history);

        var deliveredByFullName =
            delivery.DeliveredByUser?.FullName;

        if (string.IsNullOrWhiteSpace(
                deliveredByFullName))
        {
            deliveredByFullName =
                await _dbContext.Users
                    .AsNoTracking()
                    .Where(user =>
                        user.Id == currentUserId)
                    .Select(user => user.FullName)
                    .FirstOrDefaultAsync(
                        cancellationToken);
        }

        if (string.IsNullOrWhiteSpace(
                deliveredByFullName))
        {
            deliveredByFullName =
                "Naməlum istifadəçi";
        }

        var telegramMessages =
            OrderDeliveryCompletedTelegramMessageBuilder
                .Build(
                    order,
                    order.Items.ToList(),
                    order.Customer.Name,
                    order.Warehouse.Name,
                    deliveredByFullName,
                    deliveredAtUtc,
                    delivery.Photos.Count,
                    delivery.Note);

        var telegramPhotos =
            delivery.Photos
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
                TelegramChannel.Delivery,
                telegramMessages[messageIndex],
                TelegramRelatedEntityTypes.OrderDelivery,
                order.Id,
                photos: photos,
                cancellationToken:
                    cancellationToken);
        }

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return await _orderService.GetByIdAsync(
            order.Id,
            cancellationToken);
    }

    private static OrderDeliveryDto MapDelivery(
        OrderDelivery delivery)
    {
        return new OrderDeliveryDto
        {
            Id = delivery.Id,
            OrderId = delivery.OrderId,
            DeliveredByUserId =
                delivery.DeliveredByUserId,

            DeliveredByFullName =
                delivery.DeliveredByUser.FullName,

            StartedAtUtc = delivery.StartedAtUtc,
            DeliveredAtUtc = delivery.DeliveredAtUtc,
            Note = delivery.Note,

            Photos = delivery.Photos
                .OrderBy(photo => photo.CreatedAtUtc)
                .Select(
                    photo => new DeliveryPhotoDto
                    {
                        Id = photo.Id,
                        OriginalFileName =
                            photo.OriginalFileName,

                        ContentType =
                            photo.ContentType,

                        FileSizeBytes =
                            photo.FileSizeBytes,

                        UploadedByUserId =
                            photo.UploadedByUserId,

                        UploadedByFullName =
                            photo.UploadedByUser.FullName,

                        UploadedAtUtc =
                            photo.CreatedAtUtc
                    })
                .ToList()
        };
    }
}