using Microsoft.EntityFrameworkCore;
using GrandWall.Application.Abstractions.Identity;
using GrandWall.Application.Abstractions.Notifications;
using GrandWall.Application.Abstractions.ProductReturns;
using GrandWall.Application.Common.Exceptions;
using GrandWall.Application.Common.Notifications;
using GrandWall.Application.Features.ProductReturns.Dtos;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Notifications.Telegram.Formatting;
using GrandWall.Infrastructure.Persistence;

namespace GrandWall.Infrastructure.Services;

public sealed class ProductReturnSubmissionService
    : IProductReturnSubmissionService
{
    private readonly AppDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IProductReturnService _productReturnService;
    private readonly ITelegramOutboxService _telegramOutboxService;
    private readonly TimeProvider _timeProvider;

    public ProductReturnSubmissionService(
        AppDbContext dbContext,
        ICurrentUserService currentUserService,
        IProductReturnService productReturnService,
        ITelegramOutboxService telegramOutboxService,
        TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _productReturnService = productReturnService;
        _telegramOutboxService = telegramOutboxService;
        _timeProvider = timeProvider;
    }

    public async Task<ProductReturnDto> SubmitAsync(
        Guid productReturnId,
        CancellationToken cancellationToken = default)
    {
        if (!_currentUserService.IsAuthenticated)
        {
            throw new ForbiddenException(
                "Vazvradı təqdim etmək üçün sistemə daxil olmalısınız.");
        }

        var productReturn = await _dbContext.ProductReturns
            .Include(currentReturn => currentReturn.Customer)
            .Include(currentReturn => currentReturn.Warehouse)
            .Include(currentReturn => currentReturn.CreatedByUser)
            .Include(currentReturn => currentReturn.Items)
            .Include(currentReturn => currentReturn.Photos)
            .FirstOrDefaultAsync(
                currentReturn =>
                    currentReturn.Id == productReturnId,
                cancellationToken);

        if (productReturn is null)
        {
            throw new NotFoundException(
                "Vazvrad məlumatı tapılmadı.");
        }

        var currentUserId = _currentUserService.UserId;

        var isCreator =
            productReturn.CreatedByUserId == currentUserId;

        var isManager =
            _currentUserService.Role
                .CanManageOperations();

        if (!isCreator && !isManager)
        {
            throw new ForbiddenException(
                "Vazvradı yalnız daxil edən işçi və ya menecer təqdim edə bilər.");
        }

        if (productReturn.Status != ReturnStatus.Pending)
        {
            throw new ConflictException(
                "Yalnız gözləmədə olan vazvrad təqdim edilə bilər.");
        }

        if (productReturn.Photos.Count == 0)
        {
            throw new ConflictException(
                "Vazvradı təqdim etmək üçün ən azı bir sübut şəkli olmalıdır.");
        }

        var previousStatus = productReturn.Status;

        var submittedAtUtc =
            _timeProvider.GetUtcNow().UtcDateTime;

        productReturn.Submit();

        var history = new ProductReturnStatusHistory
        {
            ProductReturnId = productReturn.Id,
            PreviousStatus = previousStatus,
            NewStatus = ReturnStatus.Submitted,
            ChangedByUserId = currentUserId,
            Note = "Vazvrad menecerə təqdim edildi."
        };

        _dbContext.ProductReturnStatusHistories.Add(history);

        var orderedItems = productReturn.Items
            .OrderBy(item => item.CreatedAtUtc)
            .ToList();

        var messages =
            ProductReturnSubmittedTelegramMessageBuilder.Build(
                productReturn,
                orderedItems,
                productReturn.Customer.Name,
                productReturn.Warehouse.Name,
                productReturn.CreatedByUser.FullName,
                submittedAtUtc,
                productReturn.Photos.Count);

        var telegramPhotos = productReturn.Photos
            .OrderBy(photo => photo.CreatedAtUtc)
            .Select(photo => new TelegramOutboxPhotoRequest
            {
                CloudinaryPublicId =
                    photo.CloudinaryPublicId,

                OriginalFileName =
                    photo.OriginalFileName,

                ContentType =
                    photo.ContentType
            })
            .ToList();

        for (var messageIndex = 0;
             messageIndex < messages.Count;
             messageIndex++)
        {
            IReadOnlyCollection<TelegramOutboxPhotoRequest>?
                photosForMessage =
                    messageIndex == 0
                        ? telegramPhotos
                        : null;

            await _telegramOutboxService.EnqueueAsync(
                TelegramChannel.Returns,
                messages[messageIndex],
                TelegramRelatedEntityTypes.ProductReturn,
                productReturn.Id,
                photosForMessage,
                cancellationToken);
        }

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return await _productReturnService.GetByIdAsync(
            productReturn.Id,
            cancellationToken);
    }
}