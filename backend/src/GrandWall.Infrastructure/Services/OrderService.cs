using Microsoft.EntityFrameworkCore;
using GrandWall.Application.Abstractions.Identity;
using GrandWall.Application.Abstractions.Notifications;
using GrandWall.Application.Abstractions.Orders;
using GrandWall.Application.Common.Exceptions;
using GrandWall.Application.Common.Models;
using GrandWall.Application.Common.Notifications;
using GrandWall.Application.Features.Orders.Dtos;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Notifications.Telegram.Formatting;
using GrandWall.Infrastructure.Persistence;

namespace GrandWall.Infrastructure.Services;

public sealed class OrderService : IOrderService
{
    private readonly AppDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly TimeProvider _timeProvider;
    private readonly ITelegramOutboxService _telegramOutboxService;

    public OrderService(
    AppDbContext dbContext,
    ICurrentUserService currentUserService,
    TimeProvider timeProvider,
    ITelegramOutboxService telegramOutboxService)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _timeProvider = timeProvider;
        _telegramOutboxService = telegramOutboxService;
    }

    public async Task<PagedResultDto<OrderListItemDto>> GetAllAsync(
        OrderQueryDto query,
        CancellationToken cancellationToken = default)
    {
        var orders = _dbContext.Orders
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();

            orders = orders.Where(order =>
                order.OrderNumber.Contains(search) ||
                _dbContext.Customers.Any(customer =>
                    customer.Id == order.CustomerId &&
                    customer.Name.Contains(search)) ||
                _dbContext.OrderItems.Any(item =>
                    item.OrderId == order.Id &&
                    (item.ProductCode.Contains(search) ||
                     item.BatchNumber.Contains(search))));
        }

        if (query.CustomerId.HasValue)
        {
            orders = orders.Where(order =>
                order.CustomerId == query.CustomerId.Value);
        }

        if (query.WarehouseId.HasValue)
        {
            orders = orders.Where(order =>
                order.WarehouseId == query.WarehouseId.Value);
        }

        if (query.Status.HasValue)
        {
            orders = orders.Where(order =>
                order.Status == query.Status.Value);
        }

        if (query.FromDate.HasValue)
        {
            var fromDate = query.FromDate.Value.Date;

            orders = orders.Where(order =>
                order.OrderDateUtc >= fromDate);
        }

        if (query.ToDate.HasValue)
        {
            var toDateExclusive = query.ToDate.Value.Date.AddDays(1);

            orders = orders.Where(order =>
                order.OrderDateUtc < toDateExclusive);
        }

        var totalCount = await orders.CountAsync(cancellationToken);

        var items = await orders
            .OrderByDescending(order => order.OrderDateUtc)
            .ThenByDescending(order => order.CreatedAtUtc)
            .Skip((query.PageNumber - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(order => new OrderListItemDto
            {
                Id = order.Id,
                OrderNumber = order.OrderNumber,
                OrderDate = order.OrderDateUtc,

                CustomerId = order.CustomerId,
                CustomerName = _dbContext.Customers
                    .Where(customer => customer.Id == order.CustomerId)
                    .Select(customer => customer.Name)
                    .FirstOrDefault() ?? string.Empty,

                WarehouseId = order.WarehouseId,
                WarehouseName = _dbContext.Warehouses
                    .Where(warehouse => warehouse.Id == order.WarehouseId)
                    .Select(warehouse => warehouse.Name)
                    .FirstOrDefault() ?? string.Empty,

                Status = order.Status,

                ItemLineCount = _dbContext.OrderItems
                    .Count(item => item.OrderId == order.Id),

                TotalQuantity = _dbContext.OrderItems
                    .Where(item => item.OrderId == order.Id)
                    .Sum(item => (int?)item.Quantity) ?? 0,

                CreatedByUserId = order.CreatedByUserId,

                CreatedByFullName = _dbContext.Users
                    .Where(user => user.Id == order.CreatedByUserId)
                    .Select(user => user.FullName)
                    .FirstOrDefault() ?? string.Empty,

                PreparedByUserId = order.PreparedByUserId,

                PreparedByFullName = order.PreparedByUserId.HasValue
                    ? _dbContext.Users
                        .Where(user =>
                            user.Id == order.PreparedByUserId.Value)
                        .Select(user => user.FullName)
                        .FirstOrDefault()
                    : null,

                CreatedAtUtc = order.CreatedAtUtc,
                CompletedAtUtc = order.CompletedAtUtc,
                DeleteAfterUtc = order.DeleteAfterUtc
            })
            .ToListAsync(cancellationToken);

        return new PagedResultDto<OrderListItemDto>
        {
            Items = items,
            PageNumber = query.PageNumber,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<IReadOnlyList<ProductSuggestionDto>>
    GetProductSuggestionsAsync(
        string? search,
        int take,
        CancellationToken cancellationToken = default)
    {
        var normalizedTake = Math.Clamp(
            take,
            1,
            20);

        var orderItems = _dbContext.OrderItems
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();

            orderItems = orderItems.Where(item =>
                item.ProductCode.Contains(
                    normalizedSearch) ||
                item.BatchNumber.Contains(
                    normalizedSearch));
        }

        return await orderItems
            .GroupBy(item => new
            {
                item.ProductCode,
                item.BatchNumber,
                item.ProductType
            })
            .Select(group =>
                new ProductSuggestionDto
                {
                    ProductCode =
                        group.Key.ProductCode,

                    PartyNumber =
                        group.Key.BatchNumber,

                    ProductType =
                        group.Key.ProductType,

                    UsageCount =
                        group.Count(),

                    LastUsedAtUtc =
                        group.Max(item =>
                            item.CreatedAtUtc)
                })
            .OrderByDescending(suggestion =>
                suggestion.LastUsedAtUtc)
            .ThenByDescending(suggestion =>
                suggestion.UsageCount)
            .ThenBy(suggestion =>
                suggestion.ProductCode)
            .Take(normalizedTake)
            .ToListAsync(cancellationToken);
    }

    public async Task<OrderDto> GetByIdAsync(
    Guid id,
    CancellationToken cancellationToken = default)
    {
        var order = await _dbContext.Orders
            .AsNoTracking()
            .FirstOrDefaultAsync(
                order => order.Id == id,
                cancellationToken);

        if (order is null)
        {
            throw new NotFoundException(
                "Sifariş tapılmadı.");
        }

        var customerName = await _dbContext.Customers
            .AsNoTracking()
            .Where(customer =>
                customer.Id == order.CustomerId)
            .Select(customer => customer.Name)
            .FirstAsync(cancellationToken);

        var warehouseName = await _dbContext.Warehouses
            .AsNoTracking()
            .Where(warehouse =>
                warehouse.Id == order.WarehouseId)
            .Select(warehouse => warehouse.Name)
            .FirstAsync(cancellationToken);

        var createdByFullName = await _dbContext.Users
            .AsNoTracking()
            .Where(user =>
                user.Id == order.CreatedByUserId)
            .Select(user => user.FullName)
            .FirstAsync(cancellationToken);

        string? preparedByFullName = null;

        if (order.PreparedByUserId.HasValue)
        {
            preparedByFullName = await _dbContext.Users
                .AsNoTracking()
                .Where(user =>
                    user.Id ==
                    order.PreparedByUserId.Value)
                .Select(user => user.FullName)
                .FirstOrDefaultAsync(
                    cancellationToken);
        }

        var orderItems = await _dbContext.OrderItems
            .AsNoTracking()
            .Where(item =>
                item.OrderId == order.Id)
            .OrderBy(item => item.ProductCode)
            .ThenBy(item => item.BatchNumber)
            .Select(item => new OrderItemDto
            {
                Id = item.Id,
                ProductCode = item.ProductCode,
                PartyNumber = item.BatchNumber,
                ProductType = item.ProductType,
                Quantity = item.Quantity
            })
            .ToListAsync(cancellationToken);

        var statusHistory = await _dbContext
            .Set<OrderStatusHistory>()
            .AsNoTracking()
            .Where(history =>
                history.OrderId == order.Id)
            .OrderBy(history =>
                history.CreatedAtUtc)
            .Select(history =>
                new OrderStatusHistoryDto
                {
                    Id = history.Id,

                    PreviousStatus =
                        history.PreviousStatus,

                    NewStatus =
                        history.NewStatus,

                    ChangedByUserId =
                        history.ChangedByUserId,

                    ChangedByFullName =
                        _dbContext.Users
                            .Where(user =>
                                user.Id ==
                                history.ChangedByUserId)
                            .Select(user =>
                                user.FullName)
                            .FirstOrDefault() ??
                        string.Empty,

                    Note = history.Note,

                    ChangedAtUtc =
                        history.CreatedAtUtc
                })
            .ToListAsync(cancellationToken);

        var preparationPhotos = await _dbContext
            .Set<OrderPreparationPhoto>()
            .AsNoTracking()
            .Where(photo =>
                photo.OrderId == order.Id)
            .OrderBy(photo =>
                photo.CreatedAtUtc)
            .Select(photo =>
                new OrderPreparationPhotoDto
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
                        _dbContext.Users
                            .Where(user =>
                                user.Id ==
                                photo.UploadedByUserId)
                            .Select(user =>
                                user.FullName)
                            .FirstOrDefault() ??
                        string.Empty,

                    UploadedAtUtc =
                        photo.CreatedAtUtc
                })
            .ToListAsync(cancellationToken);

        return new OrderDto
        {
            Id = order.Id,

            OrderNumber = order.OrderNumber,

            OrderDate = order.OrderDateUtc,

            CustomerId = order.CustomerId,

            CustomerName = customerName,

            WarehouseId = order.WarehouseId,

            WarehouseName = warehouseName,

            Note = order.AdditionalNote,

            Status = order.Status,

            CreatedByUserId =
                order.CreatedByUserId,

            CreatedByFullName =
                createdByFullName,

            PreparedByUserId =
                order.PreparedByUserId,

            PreparedByFullName =
                preparedByFullName,

            PreparationStartedAtUtc =
                order.PreparationStartedAtUtc,

            PreparedAtUtc =
                order.PreparedAtUtc,

            CompletedAtUtc =
                order.CompletedAtUtc,

            DeleteAfterUtc =
                order.DeleteAfterUtc,

            CreatedAtUtc =
                order.CreatedAtUtc,

            UpdatedAtUtc =
                order.UpdatedAtUtc,

            Items = orderItems,

            StatusHistory =
                statusHistory,

            PreparationPhotos =
                preparationPhotos
        };
    }

    public async Task<OrderDto> CreateAsync(
        CreateOrderRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var normalizedOrderNumber = request.OrderNumber.Trim();

        var orderNumberExists = await _dbContext.Orders
            .AnyAsync(
                order => order.OrderNumber == normalizedOrderNumber,
                cancellationToken);

        if (orderNumberExists)
        {
            throw new ConflictException(
                "Bu qaimə nömrəsi ilə sifariş artıq mövcuddur.");
        }

        var customer = await _dbContext.Customers
            .FirstOrDefaultAsync(
                customer => customer.Id == request.CustomerId,
                cancellationToken);

        if (customer is null)
        {
            throw new NotFoundException("Müştəri tapılmadı.");
        }

        if (!customer.IsActive)
        {
            throw new ConflictException(
                "Aktiv olmayan müştəri üçün sifariş yaradıla bilməz.");
        }

        var warehouse = await _dbContext.Warehouses
            .FirstOrDefaultAsync(
                warehouse => warehouse.Id == request.WarehouseId,
                cancellationToken);

        if (warehouse is null)
        {
            throw new NotFoundException("Anbar tapılmadı.");
        }

        if (!warehouse.IsActive)
        {
            throw new ConflictException(
                "Aktiv olmayan anbar üçün sifariş yaradıla bilməz.");
        }

        var currentUserId = _currentUserService.UserId;

        var createdByFullName = await _dbContext.Users
            .AsNoTracking()
            .Where(user => user.Id == currentUserId)
            .Select(user => user.FullName)
            .FirstOrDefaultAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(createdByFullName))
        {
            createdByFullName = "Naməlum istifadəçi";
        }

        var order = new Order
        {
            OrderNumber = normalizedOrderNumber,
            OrderDateUtc = request.OrderDate.Date,
            CustomerId = request.CustomerId,
            WarehouseId = request.WarehouseId,
            AdditionalNote = NormalizeOptional(request.Note),
            CreatedByUserId = currentUserId
        };

        var orderItems = request.Items
            .Select(item => new OrderItem
            {
                OrderId = order.Id,
                ProductCode = item.ProductCode.Trim(),
                BatchNumber = item.PartyNumber.Trim(),
                ProductType = item.ProductType,
                Quantity = item.Quantity
            })
            .ToList();

        var createdHistory = new OrderStatusHistory
        {
            OrderId = order.Id,
            PreviousStatus = null,
            NewStatus = OrderStatus.Created,
            ChangedByUserId = currentUserId,
            Note = "Sifariş yaradıldı."
        };

        _dbContext.Orders.Add(order);
        _dbContext.OrderItems.AddRange(orderItems);
        _dbContext.Set<OrderStatusHistory>().Add(createdHistory);

        var telegramMessages =
            OrderCreatedTelegramMessageBuilder.Build(
                order,
                orderItems,
                customer.Name,
                warehouse.Name,
                createdByFullName);

        foreach (var telegramMessage in telegramMessages)
        {
            await _telegramOutboxService.EnqueueAsync(
                TelegramChannel.Orders,
                telegramMessage,
                TelegramRelatedEntityTypes.Order,
                order.Id,
                photos: null,
                cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(order.Id, cancellationToken);
    }

    public async Task<OrderDto> StartPreparationAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var order = await _dbContext.Orders
            .FirstOrDefaultAsync(
                order => order.Id == id,
                cancellationToken);

        if (order is null)
        {
            throw new NotFoundException("Sifariş tapılmadı.");
        }

        var currentUserId = _currentUserService.UserId;
        var previousStatus = order.Status;
        var startedAtUtc = _timeProvider.GetUtcNow().UtcDateTime;

        order.StartPreparation(
            currentUserId,
            startedAtUtc);

        var history = new OrderStatusHistory
        {
            OrderId = order.Id,
            PreviousStatus = previousStatus,
            NewStatus = order.Status,
            ChangedByUserId = currentUserId,
            Note = "Sifarişin hazırlanmasına başlanıldı."
        };

        _dbContext.Set<OrderStatusHistory>().Add(history);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(order.Id, cancellationToken);
    }

    public async Task<OrderDto> CancelAsync(
        Guid id,
        CancelOrderRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var order = await _dbContext.Orders
            .FirstOrDefaultAsync(
                order => order.Id == id,
                cancellationToken);

        if (order is null)
        {
            throw new NotFoundException("Sifariş tapılmadı.");
        }

        var currentUserId = _currentUserService.UserId;
        var previousStatus = order.Status;
        var cancelledAtUtc = _timeProvider.GetUtcNow().UtcDateTime;

        order.Cancel(cancelledAtUtc);

        var history = new OrderStatusHistory
        {
            OrderId = order.Id,
            PreviousStatus = previousStatus,
            NewStatus = order.Status,
            ChangedByUserId = currentUserId,
            Note = request.Note.Trim()
        };

        _dbContext.Set<OrderStatusHistory>().Add(history);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(order.Id, cancellationToken);
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}