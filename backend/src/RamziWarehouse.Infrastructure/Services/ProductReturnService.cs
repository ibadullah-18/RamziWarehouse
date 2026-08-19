using Microsoft.EntityFrameworkCore;
using RamziWarehouse.Application.Abstractions.Identity;
using RamziWarehouse.Application.Abstractions.Notifications;
using RamziWarehouse.Application.Abstractions.ProductReturns;
using RamziWarehouse.Application.Common.Exceptions;
using RamziWarehouse.Application.Common.Notifications;
using RamziWarehouse.Application.Features.ProductReturns.Dtos;
using RamziWarehouse.Domain.Entities;
using RamziWarehouse.Domain.Enums;
using RamziWarehouse.Infrastructure.Notifications.Telegram.Formatting;
using RamziWarehouse.Infrastructure.Persistence;

namespace RamziWarehouse.Infrastructure.Services;

public sealed class ProductReturnService : IProductReturnService
{
    private readonly AppDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITelegramOutboxService _telegramOutboxService;
    private readonly TimeProvider _timeProvider;

    public ProductReturnService(
        AppDbContext dbContext,
        ICurrentUserService currentUserService,
        ITelegramOutboxService telegramOutboxService,
        TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _telegramOutboxService = telegramOutboxService;
        _timeProvider = timeProvider;
    }

    public async Task<ProductReturnListDto> GetAllAsync(
        ProductReturnFilterDto filter,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.ProductReturns
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim();

            query = query.Where(productReturn =>
                productReturn.Customer.Name.Contains(search) ||
                productReturn.Items.Any(item =>
                    item.ProductCode.Contains(search) ||
                    item.BatchNumber.Contains(search)));
        }

        if (filter.CustomerId.HasValue)
        {
            query = query.Where(productReturn =>
                productReturn.CustomerId == filter.CustomerId.Value);
        }

        if (filter.WarehouseId.HasValue)
        {
            query = query.Where(productReturn =>
                productReturn.WarehouseId == filter.WarehouseId.Value);
        }

        if (filter.CreatedByUserId.HasValue)
        {
            query = query.Where(productReturn =>
                productReturn.CreatedByUserId ==
                filter.CreatedByUserId.Value);
        }

        if (filter.ProcessedByUserId.HasValue)
        {
            query = query.Where(productReturn =>
                productReturn.ProcessedByUserId ==
                filter.ProcessedByUserId.Value);
        }

        if (filter.Status.HasValue)
        {
            query = query.Where(productReturn =>
                productReturn.Status == filter.Status.Value);
        }

        if (filter.ProductType.HasValue)
        {
            query = query.Where(productReturn =>
                productReturn.Items.Any(item =>
                    item.ProductType == filter.ProductType.Value));
        }

        if (filter.FromDateUtc.HasValue)
        {
            query = query.Where(productReturn =>
                productReturn.ReturnDateUtc >=
                filter.FromDateUtc.Value);
        }

        if (filter.ToDateUtc.HasValue)
        {
            query = query.Where(productReturn =>
                productReturn.ReturnDateUtc <=
                filter.ToDateUtc.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var productReturns = await query
            .Include(productReturn => productReturn.Customer)
            .Include(productReturn => productReturn.Warehouse)
            .Include(productReturn => productReturn.CreatedByUser)
            .Include(productReturn => productReturn.ProcessedByUser)
            .Include(productReturn => productReturn.Items)
            .Include(productReturn => productReturn.Photos)
                .ThenInclude(photo => photo.UploadedByUser)
            .Include(productReturn => productReturn.StatusHistory)
                .ThenInclude(history => history.ChangedByUser)
            .AsSplitQuery()
            .OrderByDescending(productReturn =>
                productReturn.ReturnDateUtc)
            .ThenByDescending(productReturn =>
                productReturn.CreatedAtUtc)
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(cancellationToken);

        return new ProductReturnListDto
        {
            Items = productReturns
                .Select(MapToDto)
                .ToList(),
            PageNumber = filter.PageNumber,
            PageSize = filter.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<ProductReturnDto> GetByIdAsync(
        Guid productReturnId,
        CancellationToken cancellationToken = default)
    {
        var productReturn = await GetProductReturnQuery()
            .AsNoTracking()
            .FirstOrDefaultAsync(
                currentReturn =>
                    currentReturn.Id == productReturnId,
                cancellationToken);

        if (productReturn is null)
        {
            throw new NotFoundException(
                "Vazvrad məlumatı tapılmadı.");
        }

        return MapToDto(productReturn);
    }

    public async Task<ProductReturnDto> CreateAsync(
        CreateProductReturnDto request,
        CancellationToken cancellationToken = default)
    {
        EnsureAuthenticated();

        var customerExists = await _dbContext.Customers
            .AnyAsync(
                customer =>
                    customer.Id == request.CustomerId &&
                    customer.IsActive,
                cancellationToken);

        if (!customerExists)
        {
            throw new NotFoundException(
                "Seçilmiş müştəri tapılmadı və ya aktiv deyil.");
        }

        var warehouseExists = await _dbContext.Warehouses
            .AnyAsync(
                warehouse =>
                    warehouse.Id == request.WarehouseId &&
                    warehouse.IsActive,
                cancellationToken);

        if (!warehouseExists)
        {
            throw new NotFoundException(
                "Seçilmiş anbar tapılmadı və ya aktiv deyil.");
        }

        var duplicateItemExists = request.Items
            .GroupBy(item => new
            {
                ProductCode = item.ProductCode
                    .Trim()
                    .ToUpperInvariant(),

                BatchNumber = item.BatchNumber
                    .Trim()
                    .ToUpperInvariant(),

                item.ProductType
            })
            .Any(group => group.Count() > 1);

        if (duplicateItemExists)
        {
            throw new ConflictException(
                "Eyni məhsul kodu, partiya və növ bir neçə dəfə daxil edilib.");
        }

        var utcNow = DateTime.UtcNow;

        var productReturn = new ProductReturn
        {
            ReturnDateUtc = utcNow,
            CustomerId = request.CustomerId,
            WarehouseId = request.WarehouseId,
            AdditionalNote = NormalizeOptionalText(
                request.AdditionalNote),
            CreatedByUserId = _currentUserService.UserId,
            Items = request.Items
                .Select(item => new ProductReturnItem
                {
                    ProductCode = item.ProductCode.Trim(),
                    BatchNumber = item.BatchNumber.Trim(),
                    Quantity = item.Quantity,
                    ProductType = item.ProductType
                })
                .ToList()
        };

        productReturn.StatusHistory.Add(
            new ProductReturnStatusHistory
            {
                PreviousStatus = null,
                NewStatus = ReturnStatus.Pending,
                ChangedByUserId = _currentUserService.UserId,
                Note = "Vazvrad yaradıldı."
            });

        _dbContext.ProductReturns.Add(productReturn);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(
            productReturn.Id,
            cancellationToken);
    }

    public async Task<ProductReturnDto> CompleteAsync(
        Guid productReturnId,
        ProcessProductReturnDto request,
        CancellationToken cancellationToken = default)
    {
        EnsureManager();

        var productReturn = await _dbContext.ProductReturns
            .Include(currentReturn => currentReturn.Customer)
            .Include(currentReturn => currentReturn.Warehouse)
            .Include(currentReturn => currentReturn.Items)
            .Include(currentReturn => currentReturn.Photos)
            .AsSplitQuery()
            .FirstOrDefaultAsync(
                currentReturn =>
                    currentReturn.Id == productReturnId,
                cancellationToken);

        if (productReturn is null)
        {
            throw new NotFoundException(
                "Vazvrad məlumatı tapılmadı.");
        }

        if (productReturn.Status != ReturnStatus.Submitted)
        {
            throw new ConflictException(
                "Yalnız işçi tərəfindən təqdim edilmiş vazvrad tamamlana bilər.");
        }

        if (productReturn.Photos.Count == 0)
        {
            throw new ConflictException(
                "Vazvradı tamamlamaq üçün ən azı bir şəkil olmalıdır.");
        }

        var previousStatus = productReturn.Status;

        var utcNow =
            _timeProvider.GetUtcNow().UtcDateTime;

        var note = NormalizeOptionalText(request.Note);

        productReturn.Complete(
            _currentUserService.UserId,
            utcNow);

        var statusHistory = new ProductReturnStatusHistory
        {
            ProductReturnId = productReturn.Id,
            PreviousStatus = previousStatus,
            NewStatus = ReturnStatus.Completed,
            ChangedByUserId = _currentUserService.UserId,
            Note = note ?? "Vazvrad tamamlandı."
        };

        _dbContext.ProductReturnStatusHistories.Add(
            statusHistory);

        await EnqueueProcessingNotificationAsync(
            productReturn,
            note,
            utcNow,
            cancellationToken);

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return await GetByIdAsync(
            productReturn.Id,
            cancellationToken);
    }
    public async Task<ProductReturnDto> CancelAsync(
        Guid productReturnId,
        ProcessProductReturnDto request,
        CancellationToken cancellationToken = default)
    {
        EnsureManager();

        var productReturn = await _dbContext.ProductReturns
            .Include(currentReturn => currentReturn.Customer)
            .Include(currentReturn => currentReturn.Warehouse)
            .Include(currentReturn => currentReturn.Items)
            .Include(currentReturn => currentReturn.Photos)
            .AsSplitQuery()
            .FirstOrDefaultAsync(
                currentReturn =>
                    currentReturn.Id == productReturnId,
                cancellationToken);

        if (productReturn is null)
        {
            throw new NotFoundException(
                "Vazvrad məlumatı tapılmadı.");
        }

        if (productReturn.Status != ReturnStatus.Pending &&
            productReturn.Status != ReturnStatus.Submitted)
        {
            throw new ConflictException(
                "Yalnız gözləmədə və ya təqdim edilmiş vazvrad ləğv edilə bilər.");
        }

        var previousStatus = productReturn.Status;

        var utcNow =
            _timeProvider.GetUtcNow().UtcDateTime;

        var note = NormalizeOptionalText(request.Note);

        productReturn.Cancel(
            _currentUserService.UserId,
            utcNow);

        var statusHistory = new ProductReturnStatusHistory
        {
            ProductReturnId = productReturn.Id,
            PreviousStatus = previousStatus,
            NewStatus = ReturnStatus.Cancelled,
            ChangedByUserId = _currentUserService.UserId,
            Note = note ?? "Vazvrad ləğv edildi."
        };

        _dbContext.ProductReturnStatusHistories.Add(
            statusHistory);

        await EnqueueProcessingNotificationAsync(
            productReturn,
            note,
            utcNow,
            cancellationToken);

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return await GetByIdAsync(
            productReturn.Id,
            cancellationToken);
    }

    private async Task EnqueueProcessingNotificationAsync(
    ProductReturn productReturn,
    string? processNote,
    DateTime processedAtUtc,
    CancellationToken cancellationToken)
    {
        var orderedItems = productReturn.Items
            .OrderBy(item => item.CreatedAtUtc)
            .ToList();

        var messages =
            ProductReturnProcessedTelegramMessageBuilder.Build(
                productReturn,
                orderedItems,
                productReturn.Customer.Name,
                productReturn.Warehouse.Name,
                _currentUserService.FullName,
                processedAtUtc,
                processNote,
                productReturn.Photos.Count);

        foreach (var message in messages)
        {
            await _telegramOutboxService.EnqueueAsync(
                TelegramChannel.Returns,
                message,
                TelegramRelatedEntityTypes.ProductReturn,
                productReturn.Id,
                photos: null,
                cancellationToken);
        }
    }

    private IQueryable<ProductReturn> GetProductReturnQuery()
    {
        return _dbContext.ProductReturns
            .Include(productReturn => productReturn.Customer)
            .Include(productReturn => productReturn.Warehouse)
            .Include(productReturn => productReturn.CreatedByUser)
            .Include(productReturn => productReturn.ProcessedByUser)
            .Include(productReturn => productReturn.Items)
            .Include(productReturn => productReturn.Photos)
                .ThenInclude(photo => photo.UploadedByUser)
            .Include(productReturn => productReturn.StatusHistory)
                .ThenInclude(history => history.ChangedByUser)
            .AsSplitQuery();
    }

    private void EnsureAuthenticated()
    {
        if (!_currentUserService.IsAuthenticated)
        {
            throw new ForbiddenException(
                "Bu əməliyyat üçün sistemə daxil olmalısınız.");
        }
    }

    private void EnsureManager()
    {
        EnsureAuthenticated();

        if (!_currentUserService.Role
        .CanManageOperations())
        {
            throw new ForbiddenException(
                "Bu əməliyyatı yalnız Menecer " +
                "və ya Admin edə bilər.");
        }
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }

    private static ProductReturnDto MapToDto(
        ProductReturn productReturn)
    {
        return new ProductReturnDto
        {
            Id = productReturn.Id,
            ReturnDateUtc = productReturn.ReturnDateUtc,
            CustomerId = productReturn.CustomerId,
            CustomerName = productReturn.Customer.Name,
            WarehouseId = productReturn.WarehouseId,
            WarehouseName = productReturn.Warehouse.Name,
            AdditionalNote = productReturn.AdditionalNote,
            Status = productReturn.Status,
            CreatedByUserId = productReturn.CreatedByUserId,
            CreatedByFullName =
                productReturn.CreatedByUser.FullName,
            ProcessedByUserId =
                productReturn.ProcessedByUserId,
            ProcessedByFullName =
                productReturn.ProcessedByUser?.FullName,
            ProcessedAtUtc = productReturn.ProcessedAtUtc,
            CreatedAtUtc = productReturn.CreatedAtUtc,
            CompletedAtUtc = productReturn.CompletedAtUtc,
            DeleteAfterUtc = productReturn.DeleteAfterUtc,

            Items = productReturn.Items
                .OrderBy(item => item.CreatedAtUtc)
                .Select(item => new ProductReturnItemDto
                {
                    Id = item.Id,
                    ProductCode = item.ProductCode,
                    BatchNumber = item.BatchNumber,
                    Quantity = item.Quantity,
                    ProductType = item.ProductType
                })
                .ToList(),

            Photos = productReturn.Photos
                .OrderBy(photo => photo.CreatedAtUtc)
                .Select(photo => new ProductReturnPhotoDto
                {
                    Id = photo.Id,
                    OriginalFileName =
                        photo.OriginalFileName,
                    ContentType = photo.ContentType,
                    FileSizeBytes = photo.FileSizeBytes,
                    UploadedByUserId =
                        photo.UploadedByUserId,
                    UploadedByFullName =
                        photo.UploadedByUser.FullName,
                    CreatedAtUtc = photo.CreatedAtUtc
                })
                .ToList(),

            StatusHistory = productReturn.StatusHistory
                .OrderBy(history => history.CreatedAtUtc)
                .Select(history =>
                    new ProductReturnStatusHistoryDto
                    {
                        Id = history.Id,
                        PreviousStatus =
                            history.PreviousStatus,
                        NewStatus = history.NewStatus,
                        ChangedByUserId =
                            history.ChangedByUserId,
                        ChangedByFullName =
                            history.ChangedByUser.FullName,
                        Note = history.Note,
                        ChangedAtUtc =
                            history.CreatedAtUtc
                    })
                .ToList()
        };
    }
}