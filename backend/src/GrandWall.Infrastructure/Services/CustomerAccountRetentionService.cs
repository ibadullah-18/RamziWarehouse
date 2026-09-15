using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GrandWall.Application.Abstractions.CustomerAccounts;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Persistence;

namespace GrandWall.Infrastructure.Services;

public sealed class CustomerAccountRetentionService
    : ICustomerAccountRetentionService
{
    private const int CustomerBatchSize = 100;
    private static readonly TimeSpan BakuUtcOffset =
        TimeSpan.FromHours(4);

    private readonly AppDbContext _dbContext;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<CustomerAccountRetentionService> _logger;

    public CustomerAccountRetentionService(
        AppDbContext dbContext,
        TimeProvider timeProvider,
        ILogger<CustomerAccountRetentionService> logger)
    {
        _dbContext = dbContext;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public async Task<int> CleanupExpiredEntriesAsync(
        CancellationToken cancellationToken = default)
    {
        var currentDate = GetCurrentBusinessDate();
        var expirationDate = currentDate.AddMonths(-6);

        var customerIds = await _dbContext.CustomerAccountEntries
            .AsNoTracking()
            .Where(entry => entry.BusinessDate <= expirationDate)
            .Select(entry => entry.CustomerId)
            .Distinct()
            .OrderBy(customerId => customerId)
            .Take(CustomerBatchSize)
            .ToListAsync(cancellationToken);

        var totalDeleted = 0;

        foreach (var customerId in customerIds)
        {
            try
            {
                totalDeleted += await CleanupCustomerAsync(
                    customerId,
                    expirationDate,
                    cancellationToken);
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
                    "6 aylıq açot tarixçəsi silinə bilmədi. CustomerId: {CustomerId}",
                    customerId);

                _dbContext.ChangeTracker.Clear();
            }
        }

        return totalDeleted;
    }

    private async Task<int> CleanupCustomerAsync(
        Guid customerId,
        DateOnly expirationDate,
        CancellationToken cancellationToken)
    {
        var strategy = _dbContext.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            _dbContext.ChangeTracker.Clear();

            await using var transaction =
                await _dbContext.Database.BeginTransactionAsync(
                    IsolationLevel.Serializable,
                    cancellationToken);

            var expiredEntries = await _dbContext.CustomerAccountEntries
                .Where(entry =>
                    entry.CustomerId == customerId &&
                    entry.BusinessDate <= expirationDate)
                .OrderBy(entry => entry.BusinessDate)
                .ThenBy(entry => entry.CreatedAtUtc)
                .ToListAsync(cancellationToken);

            if (expiredEntries.Count == 0)
            {
                await transaction.CommitAsync(cancellationToken);
                return 0;
            }

            var positiveAmount = expiredEntries
                .Where(entry =>
                    entry.EntryType == CustomerAccountEntryType.OpeningBalance ||
                    entry.EntryType == CustomerAccountEntryType.Debt ||
                    entry.EntryType == CustomerAccountEntryType.AdjustmentIncrease)
                .Sum(entry => entry.Amount);

            var negativeAmount = expiredEntries
                .Where(entry =>
                    entry.EntryType == CustomerAccountEntryType.Payment ||
                    entry.EntryType == CustomerAccountEntryType.AdjustmentDecrease)
                .Sum(entry => entry.Amount);

            var carriedBalance = positiveAmount - negativeAmount;

            if (carriedBalance < 0)
            {
                throw new InvalidOperationException(
                    "Köhnə açot məlumatlarında mənfi qalıq aşkarlandı.");
            }

            var sourceEntry = expiredEntries
                .OrderByDescending(entry => entry.CreatedAtUtc)
                .First();

            _dbContext.CustomerAccountEntries.RemoveRange(expiredEntries);
            await _dbContext.SaveChangesAsync(cancellationToken);

            var existingOpening =
                await _dbContext.CustomerAccountEntries.FirstOrDefaultAsync(
                    entry =>
                        entry.CustomerId == customerId &&
                        entry.EntryType ==
                            CustomerAccountEntryType.OpeningBalance,
                    cancellationToken);

            if (existingOpening is not null)
            {
                carriedBalance += existingOpening.Amount;
                _dbContext.CustomerAccountEntries.Remove(existingOpening);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }

            if (carriedBalance > 0)
            {
                _dbContext.CustomerAccountEntries.Add(
                    new CustomerAccountEntry
                    {
                        CustomerId = customerId,
                        EntryType = CustomerAccountEntryType.OpeningBalance,
                        Amount = carriedBalance,
                        BusinessDate = expirationDate.AddDays(1),
                        Note = "6 aylıq avtomatik qalıq borc transferi.",
                        RecordedByUserId = sourceEntry.RecordedByUserId,
                        RecordedByFullName = "Sistem",
                        RecordedByRole = sourceEntry.RecordedByRole
                    });

                await _dbContext.SaveChangesAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
            return expiredEntries.Count;
        });
    }

    private DateOnly GetCurrentBusinessDate()
    {
        var bakuNow = _timeProvider.GetUtcNow().ToOffset(BakuUtcOffset);
        return DateOnly.FromDateTime(bakuNow.DateTime);
    }
}
