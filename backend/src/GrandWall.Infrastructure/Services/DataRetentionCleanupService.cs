using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GrandWall.Application.Abstractions.Files;
using GrandWall.Application.Abstractions.Retention;
using GrandWall.Application.Common.Retention;
using GrandWall.Infrastructure.Persistence;

namespace GrandWall.Infrastructure.Services;

public sealed class DataRetentionCleanupService
    : IDataRetentionCleanupService
{
    private const int BatchSize = 100;

    private readonly AppDbContext _dbContext;
    private readonly IFileStorageService _fileStorageService;
    private readonly ILogger<DataRetentionCleanupService> _logger;

    public DataRetentionCleanupService(
        AppDbContext dbContext,
        IFileStorageService fileStorageService,
        ILogger<DataRetentionCleanupService> logger)
    {
        _dbContext = dbContext;
        _fileStorageService = fileStorageService;
        _logger = logger;
    }

    public async Task<RetentionCleanupResultDto>
        CleanupExpiredDataAsync(
            CancellationToken cancellationToken = default)
    {
        var utcNow = DateTime.UtcNow;
        var result = new RetentionCleanupResultDto();

        result.DeletedOrders =
            await DeleteExpiredOrdersAsync(
                utcNow,
                cancellationToken);

        result.DeletedProductReturns =
            await DeleteExpiredProductReturnsAsync(
                utcNow,
                cancellationToken);

        result.DeletedAttendanceRecords =
            await DeleteExpiredAttendanceRecordsAsync(
                utcNow,
                cancellationToken);

        return result;
    }

    private async Task<int> DeleteExpiredOrdersAsync(
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var expiredOrders = await _dbContext.Orders
            .Where(order =>
                order.DeleteAfterUtc.HasValue &&
                order.DeleteAfterUtc <= utcNow)
            .OrderBy(order => order.DeleteAfterUtc)
            .Take(BatchSize)
            .Include(order => order.PreparationPhotos)
            .Include(order => order.Delivery)
                .ThenInclude(delivery => delivery!.Photos)
            .AsSplitQuery()
            .ToListAsync(cancellationToken);

        var deletedCount = 0;

        foreach (var order in expiredOrders)
        {
            try
            {
                var publicIds = order.PreparationPhotos
                    .Select(photo => photo.CloudinaryPublicId)
                    .ToList();

                if (order.Delivery is not null)
                {
                    publicIds.AddRange(
                        order.Delivery.Photos.Select(
                            photo =>
                                photo.CloudinaryPublicId));
                }

                await DeleteImagesAsync(
                    publicIds,
                    cancellationToken);

                _dbContext.Orders.Remove(order);

                await _dbContext.SaveChangesAsync(
                    cancellationToken);

                deletedCount++;
            }
            catch (OperationCanceledException)
                when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                _logger.LogError(
                    exception,
                    "40 günlük sifariş silinə bilmədi. " +
                    "OrderId: {OrderId}",
                    order.Id);

                _dbContext.ChangeTracker.Clear();
            }
        }

        return deletedCount;
    }

    private async Task<int> DeleteExpiredProductReturnsAsync(
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var expiredReturns = await _dbContext.ProductReturns
            .Where(productReturn =>
                productReturn.DeleteAfterUtc.HasValue &&
                productReturn.DeleteAfterUtc <= utcNow)
            .OrderBy(productReturn =>
                productReturn.DeleteAfterUtc)
            .Take(BatchSize)
            .Include(productReturn => productReturn.Photos)
            .AsSplitQuery()
            .ToListAsync(cancellationToken);

        var deletedCount = 0;

        foreach (var productReturn in expiredReturns)
        {
            try
            {
                var publicIds = productReturn.Photos
                    .Select(photo => photo.CloudinaryPublicId)
                    .ToList();

                await DeleteImagesAsync(
                    publicIds,
                    cancellationToken);

                _dbContext.ProductReturns.Remove(
                    productReturn);

                await _dbContext.SaveChangesAsync(
                    cancellationToken);

                deletedCount++;
            }
            catch (OperationCanceledException)
                when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                _logger.LogError(
                    exception,
                    "40 günlük vazvrad silinə bilmədi. " +
                    "ProductReturnId: {ProductReturnId}",
                    productReturn.Id);

                _dbContext.ChangeTracker.Clear();
            }
        }

        return deletedCount;
    }

    private async Task<int> DeleteExpiredAttendanceRecordsAsync(
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var expiredRecords = await _dbContext.AttendanceRecords
            .Where(record =>
                record.DeleteAfterUtc.HasValue &&
                record.DeleteAfterUtc <= utcNow)
            .OrderBy(record => record.DeleteAfterUtc)
            .Take(BatchSize)
            .ToListAsync(cancellationToken);

        if (expiredRecords.Count == 0)
        {
            return 0;
        }

        try
        {
            _dbContext.AttendanceRecords.RemoveRange(
                expiredRecords);

            await _dbContext.SaveChangesAsync(
                cancellationToken);

            return expiredRecords.Count;
        }
        catch (OperationCanceledException)
            when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "40 günlük işə giriş-çıxış qeydləri silinə bilmədi.");

            _dbContext.ChangeTracker.Clear();

            return 0;
        }
    }

    private async Task DeleteImagesAsync(
        IEnumerable<string> publicIds,
        CancellationToken cancellationToken)
    {
        var uniquePublicIds = publicIds
            .Where(publicId =>
                !string.IsNullOrWhiteSpace(publicId))
            .Distinct(StringComparer.Ordinal)
            .ToList();

        foreach (var publicId in uniquePublicIds)
        {
            await _fileStorageService.DeleteImageAsync(
                publicId,
                cancellationToken);
        }
    }
}