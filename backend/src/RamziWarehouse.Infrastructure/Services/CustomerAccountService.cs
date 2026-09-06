using System.Data;
using Microsoft.EntityFrameworkCore;
using RamziWarehouse.Application.Abstractions.CustomerAccounts;
using RamziWarehouse.Application.Abstractions.Identity;
using RamziWarehouse.Application.Common.Exceptions;
using RamziWarehouse.Application.Features.CustomerAccounts.Dtos;
using RamziWarehouse.Domain.Entities;
using RamziWarehouse.Domain.Enums;
using RamziWarehouse.Infrastructure.Persistence;

namespace RamziWarehouse.Infrastructure.Services;

public sealed class CustomerAccountService : ICustomerAccountService
{
    private static readonly TimeSpan BakuUtcOffset =
        TimeSpan.FromHours(4);

    private readonly AppDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly TimeProvider _timeProvider;

    public CustomerAccountService(
        AppDbContext dbContext,
        ICurrentUserService currentUserService,
        TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _timeProvider = timeProvider;
    }

    public async Task<CustomerAccountListDto> GetAllAsync(
        CustomerAccountListQueryDto query,
        CancellationToken cancellationToken = default)
    {
        EnsureRole("Manager", "Admin", "Ram", "Driver");
        var businessDate = query.Date ?? GetCurrentBusinessDate();
        var customersQuery = _dbContext.Customers
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            customersQuery = customersQuery.Where(customer =>
                customer.Name.Contains(search) ||
                (customer.PhoneNumber != null &&
                 customer.PhoneNumber.Contains(search)));
        }

        var totalCount = await customersQuery.CountAsync(cancellationToken);
        var customers = await customersQuery
            .OrderBy(customer => customer.Name)
            .Skip((query.PageNumber - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(customer => new
            {
                customer.Id,
                customer.Name,
                customer.PhoneNumber,
                customer.IsActive
            })
            .ToListAsync(cancellationToken);

        if (customers.Count == 0)
        {
            return new CustomerAccountListDto
            {
                Items = [],
                BusinessDate = businessDate,
                PageNumber = query.PageNumber,
                PageSize = query.PageSize,
                TotalCount = totalCount
            };
        }

        var customerIds = customers.Select(customer => customer.Id).ToList();
        var entries = await _dbContext.CustomerAccountEntries
            .AsNoTracking()
            .Where(entry =>
                customerIds.Contains(entry.CustomerId) &&
                entry.BusinessDate <= businessDate)
            .Select(entry => new
            {
                entry.CustomerId,
                entry.EntryType,
                entry.Amount,
                entry.BusinessDate
            })
            .ToListAsync(cancellationToken);

        var summaries = new List<CustomerAccountSummaryDto>(customers.Count);

        foreach (var customer in customers)
        {
            var customerEntries = entries
                .Where(entry => entry.CustomerId == customer.Id)
                .ToList();

            var openingBalance = customerEntries
                .Where(entry =>
                    entry.EntryType == CustomerAccountEntryType.OpeningBalance)
                .Sum(entry => entry.Amount);

            var adjustmentIncrease = customerEntries
                .Where(entry =>
                    entry.EntryType == CustomerAccountEntryType.AdjustmentIncrease)
                .Sum(entry => entry.Amount);

            var adjustmentDecrease = customerEntries
                .Where(entry =>
                    entry.EntryType == CustomerAccountEntryType.AdjustmentDecrease)
                .Sum(entry => entry.Amount);

            var previousDailyDebt = customerEntries
                .Where(entry =>
                    entry.EntryType == CustomerAccountEntryType.Debt &&
                    entry.BusinessDate < businessDate)
                .Sum(entry => entry.Amount);

            var previousPayments = customerEntries
                .Where(entry =>
                    entry.EntryType == CustomerAccountEntryType.Payment &&
                    entry.BusinessDate < businessDate)
                .Sum(entry => entry.Amount);

            var previousDebt =
                openingBalance +
                adjustmentIncrease -
                adjustmentDecrease +
                previousDailyDebt -
                previousPayments;

            var todayDebt = customerEntries
                .Where(entry =>
                    entry.EntryType == CustomerAccountEntryType.Debt &&
                    entry.BusinessDate == businessDate)
                .Sum(entry => entry.Amount);

            var todayPayment = customerEntries
                .Where(entry =>
                    entry.EntryType == CustomerAccountEntryType.Payment &&
                    entry.BusinessDate == businessDate)
                .Sum(entry => entry.Amount);

            // Payments are allocated to the oldest debt first.
            var paidFromPreviousDebt = Math.Min(
                todayPayment,
                Math.Max(previousDebt, 0));

            var previousDebtRemaining = Math.Max(
                previousDebt - paidFromPreviousDebt,
                0);

            var paymentAfterPreviousDebt = Math.Max(
                todayPayment - paidFromPreviousDebt,
                0);

            var paidFromTodayDebt = Math.Min(
                paymentAfterPreviousDebt,
                Math.Max(todayDebt, 0));

            var todayDebtRemaining = Math.Max(
                todayDebt - paidFromTodayDebt,
                0);

            summaries.Add(new CustomerAccountSummaryDto
            {
                CustomerId = customer.Id,
                CustomerName = customer.Name,
                PhoneNumber = customer.PhoneNumber,
                IsActive = customer.IsActive,
                BusinessDate = businessDate,
                PreviousDebt = previousDebt,
                TodayDebt = todayDebt,
                TodayPayment = todayPayment,
                PaidFromPreviousDebt = paidFromPreviousDebt,
                PaidFromTodayDebt = paidFromTodayDebt,
                PreviousDebtRemaining = previousDebtRemaining,
                TodayDebtRemaining = todayDebtRemaining,
                RemainingDebt =
                    previousDebtRemaining + todayDebtRemaining
            });
        }

        return new CustomerAccountListDto
        {
            Items = summaries,
            BusinessDate = businessDate,
            PageNumber = query.PageNumber,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<CustomerAccountDetailsDto> GetByCustomerIdAsync(
        Guid customerId,
        CancellationToken cancellationToken = default)
    {
        EnsureRole("Manager", "Admin", "Ram", "Driver");

        var customer = await _dbContext.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(
                currentCustomer => currentCustomer.Id == customerId,
                cancellationToken);

        if (customer is null)
        {
            throw new NotFoundException("Müştəri tapılmadı.");
        }

        var entries = await _dbContext.CustomerAccountEntries
            .AsNoTracking()
            .Where(entry => entry.CustomerId == customerId)
            .OrderBy(entry => entry.BusinessDate)
            .ThenBy(entry => entry.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var entryDtos = entries.Select(MapEntry).ToList();
        var days = new List<CustomerAccountDayDto>();
        decimal runningDebt = 0;

        foreach (var dayGroup in entryDtos
            .GroupBy(entry => entry.BusinessDate)
            .OrderBy(group => group.Key))
        {
            var importedPreviousDebt = dayGroup
                .Where(entry =>
                    entry.EntryType == CustomerAccountEntryType.OpeningBalance)
                .Sum(entry => entry.Amount);

            var adjustmentIncrease = dayGroup
                .Where(entry =>
                    entry.EntryType == CustomerAccountEntryType.AdjustmentIncrease)
                .Sum(entry => entry.Amount);

            var adjustmentDecrease = dayGroup
                .Where(entry =>
                    entry.EntryType == CustomerAccountEntryType.AdjustmentDecrease)
                .Sum(entry => entry.Amount);

            var adjustmentAmount = adjustmentIncrease - adjustmentDecrease;
            var openingDebt = runningDebt + importedPreviousDebt;

            var addedDebt = dayGroup
                .Where(entry =>
                    entry.EntryType == CustomerAccountEntryType.Debt)
                .Sum(entry => entry.Amount);

            var paidAmount = dayGroup
                .Where(entry =>
                    entry.EntryType == CustomerAccountEntryType.Payment)
                .Sum(entry => entry.Amount);

            var closingDebt =
                openingDebt + adjustmentAmount + addedDebt - paidAmount;

            days.Add(new CustomerAccountDayDto
            {
                BusinessDate = dayGroup.Key,
                OpeningDebt = openingDebt,
                AdjustmentAmount = adjustmentAmount,
                AddedDebt = addedDebt,
                PaidAmount = paidAmount,
                ClosingDebt = closingDebt,
                Entries = dayGroup
                    .OrderByDescending(entry => entry.CreatedAtUtc)
                    .ToList()
            });

            runningDebt = closingDebt;
        }

        var previousDebt = entryDtos
            .Where(entry =>
                entry.EntryType == CustomerAccountEntryType.OpeningBalance ||
                entry.EntryType == CustomerAccountEntryType.AdjustmentIncrease)
            .Sum(entry => entry.Amount) -
            entryDtos
                .Where(entry =>
                    entry.EntryType == CustomerAccountEntryType.AdjustmentDecrease)
                .Sum(entry => entry.Amount);

        var totalNewDebt = entryDtos
            .Where(entry => entry.EntryType == CustomerAccountEntryType.Debt)
            .Sum(entry => entry.Amount);

        var totalPaid = entryDtos
            .Where(entry => entry.EntryType == CustomerAccountEntryType.Payment)
            .Sum(entry => entry.Amount);

        var totalDebt = previousDebt + totalNewDebt;

        return new CustomerAccountDetailsDto
        {
            CustomerId = customer.Id,
            CustomerName = customer.Name,
            PhoneNumber = customer.PhoneNumber,
            IsActive = customer.IsActive,
            PreviousDebt = previousDebt,
            TotalNewDebt = totalNewDebt,
            TotalDebt = totalDebt,
            TotalPaid = totalPaid,
            RemainingDebt = totalDebt - totalPaid,
            Days = days.OrderByDescending(day => day.BusinessDate).ToList()
        };
    }

    public async Task<CustomerAccountDetailsDto> CreateTodayAsync(
        CreateCustomerAccountRequestDto request,
        CancellationToken cancellationToken = default)
    {
        EnsureRole("Manager", "Admin", "Ram");

        if (request.TodayDebt <= 0 &&
            request.InitialPreviousDebt.GetValueOrDefault() <= 0)
        {
            throw new ConflictException(
                "Bugünkü və ya əvvəlki borcdan ən az biri sıfırdan böyük olmalıdır.");
        }

        var businessDate = GetCurrentBusinessDate();
        var note = NormalizeOptional(request.Note);
        var executionStrategy = _dbContext.Database.CreateExecutionStrategy();

        await executionStrategy.ExecuteAsync(async () =>
        {
            _dbContext.ChangeTracker.Clear();

            await using var transaction =
                await _dbContext.Database.BeginTransactionAsync(
                    IsolationLevel.Serializable,
                    cancellationToken);

            var customer = await _dbContext.Customers.FirstOrDefaultAsync(
                currentCustomer => currentCustomer.Id == request.CustomerId,
                cancellationToken);

            if (customer is null)
            {
                throw new NotFoundException("Müştəri tapılmadı.");
            }

            if (!customer.IsActive)
            {
                throw new ConflictException(
                    "Deaktiv müştəri üçün yeni borc yaradıla bilməz.");
            }

            var hasHistory = await _dbContext.CustomerAccountEntries.AnyAsync(
                entry => entry.CustomerId == request.CustomerId,
                cancellationToken);

            var initialDebt = request.InitialPreviousDebt.GetValueOrDefault();

            if (initialDebt > 0 && hasHistory)
            {
                throw new ConflictException(
                    "Əvvəlki borc yalnız ilk hesab yaradılarkən yazıla bilər.");
            }

            if (request.TodayDebt > 0)
            {
                var todayDebtExists =
                    await _dbContext.CustomerAccountEntries.AnyAsync(
                        entry =>
                            entry.CustomerId == request.CustomerId &&
                            entry.BusinessDate == businessDate &&
                            entry.EntryType == CustomerAccountEntryType.Debt,
                        cancellationToken);

                if (todayDebtExists)
                {
                    throw new ConflictException(
                        "Bu müştəri üçün bugünkü borc artıq yaradılıb.");
                }
            }

            if (initialDebt > 0)
            {
                _dbContext.CustomerAccountEntries.Add(CreateEntry(
                    request.CustomerId,
                    CustomerAccountEntryType.OpeningBalance,
                    initialDebt,
                    businessDate,
                    note));
            }

            if (request.TodayDebt > 0)
            {
                _dbContext.CustomerAccountEntries.Add(CreateEntry(
                    request.CustomerId,
                    CustomerAccountEntryType.Debt,
                    request.TodayDebt,
                    businessDate,
                    note));
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return true;
        });

        return await GetByCustomerIdAsync(request.CustomerId, cancellationToken);
    }

    public async Task<CustomerAccountDetailsDto> RecordPaymentAsync(
        RecordCustomerPaymentRequestDto request,
        CancellationToken cancellationToken = default)
    {
        EnsureRole("Manager", "Admin", "Driver");

        if (request.Amount <= 0)
        {
            throw new ConflictException("Ödəniş sıfırdan böyük olmalıdır.");
        }

        var businessDate = GetCurrentBusinessDate();
        var note = NormalizeOptional(request.Note);
        var executionStrategy = _dbContext.Database.CreateExecutionStrategy();

        await executionStrategy.ExecuteAsync(async () =>
        {
            _dbContext.ChangeTracker.Clear();

            await using var transaction =
                await _dbContext.Database.BeginTransactionAsync(
                    IsolationLevel.Serializable,
                    cancellationToken);

            var customerExists = await _dbContext.Customers.AnyAsync(
                customer => customer.Id == request.CustomerId,
                cancellationToken);

            if (!customerExists)
            {
                throw new NotFoundException("Müştəri tapılmadı.");
            }

            var remainingDebt = await GetRemainingDebtAsync(
                request.CustomerId,
                cancellationToken);

            if (remainingDebt <= 0)
            {
                throw new ConflictException(
                    "Bu müştərinin ödənilməmiş borcu yoxdur.");
            }

            if (request.Amount > remainingDebt)
            {
                throw new ConflictException(
                    $"Ödəniş qalıq borcdan çox ola bilməz. Qalıq: {remainingDebt:0.00} AZN.");
            }

            _dbContext.CustomerAccountEntries.Add(CreateEntry(
                request.CustomerId,
                CustomerAccountEntryType.Payment,
                request.Amount,
                businessDate,
                note));

            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return true;
        });

        return await GetByCustomerIdAsync(request.CustomerId, cancellationToken);
    }

    public async Task<CustomerAccountDetailsDto> CorrectPreviousDebtAsync(
        CorrectPreviousDebtRequestDto request,
        CancellationToken cancellationToken = default)
    {
        EnsureRole("Manager", "Admin", "Ram");

        if (request.CorrectedPreviousDebt < 0)
        {
            throw new ConflictException(
                "Düzəldilmiş köhnə borc mənfi ola bilməz.");
        }

        var reason = NormalizeOptional(request.Reason);

        if (reason is null)
        {
            throw new ConflictException("Düzəliş səbəbi yazılmalıdır.");
        }

        var businessDate = GetCurrentBusinessDate();
        var executionStrategy = _dbContext.Database.CreateExecutionStrategy();

        await executionStrategy.ExecuteAsync(async () =>
        {
            _dbContext.ChangeTracker.Clear();

            await using var transaction =
                await _dbContext.Database.BeginTransactionAsync(
                    IsolationLevel.Serializable,
                    cancellationToken);

            var customerExists = await _dbContext.Customers.AnyAsync(
                customer => customer.Id == request.CustomerId,
                cancellationToken);

            if (!customerExists)
            {
                throw new NotFoundException("Müştəri tapılmadı.");
            }

            var hasHistory = await _dbContext.CustomerAccountEntries.AnyAsync(
                entry => entry.CustomerId == request.CustomerId,
                cancellationToken);

            if (!hasHistory)
            {
                throw new ConflictException(
                    "Əvvəlcə müştərinin ilk hesabı yaradılmalıdır.");
            }

            var openingBalance = await SumEntryTypeAsync(
                request.CustomerId,
                CustomerAccountEntryType.OpeningBalance,
                cancellationToken);

            var increase = await SumEntryTypeAsync(
                request.CustomerId,
                CustomerAccountEntryType.AdjustmentIncrease,
                cancellationToken);

            var decrease = await SumEntryTypeAsync(
                request.CustomerId,
                CustomerAccountEntryType.AdjustmentDecrease,
                cancellationToken);

            var currentPreviousDebt = openingBalance + increase - decrease;
            var difference = request.CorrectedPreviousDebt - currentPreviousDebt;

            if (difference == 0)
            {
                throw new ConflictException(
                    "Yeni köhnə borc mövcud məbləğlə eynidir.");
            }

            var totalNewDebt = await SumEntryTypeAsync(
                request.CustomerId,
                CustomerAccountEntryType.Debt,
                cancellationToken);

            var totalPaid = await SumEntryTypeAsync(
                request.CustomerId,
                CustomerAccountEntryType.Payment,
                cancellationToken);

            if (request.CorrectedPreviousDebt + totalNewDebt - totalPaid < 0)
            {
                throw new ConflictException(
                    "Bu düzəliş ümumi qalıq borcu mənfi edir.");
            }

            var entryType = difference > 0
                ? CustomerAccountEntryType.AdjustmentIncrease
                : CustomerAccountEntryType.AdjustmentDecrease;

            var correctionNote =
                "Köhnə borc düzəlişi. " +
                $"Əvvəl: {currentPreviousDebt:0.00} AZN. " +
                $"Yeni: {request.CorrectedPreviousDebt:0.00} AZN. " +
                $"Səbəb: {reason}";

            if (correctionNote.Length > 500)
            {
                correctionNote = correctionNote.Substring(0, 500);
            }

            _dbContext.CustomerAccountEntries.Add(CreateEntry(
                request.CustomerId,
                entryType,
                Math.Abs(difference),
                businessDate,
                correctionNote));

            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return true;
        });

        return await GetByCustomerIdAsync(request.CustomerId, cancellationToken);
    }

    private async Task<decimal> GetRemainingDebtAsync(
        Guid customerId,
        CancellationToken cancellationToken)
    {
        var openingBalance = await SumEntryTypeAsync(
            customerId,
            CustomerAccountEntryType.OpeningBalance,
            cancellationToken);

        var dailyDebt = await SumEntryTypeAsync(
            customerId,
            CustomerAccountEntryType.Debt,
            cancellationToken);

        var payment = await SumEntryTypeAsync(
            customerId,
            CustomerAccountEntryType.Payment,
            cancellationToken);

        var increase = await SumEntryTypeAsync(
            customerId,
            CustomerAccountEntryType.AdjustmentIncrease,
            cancellationToken);

        var decrease = await SumEntryTypeAsync(
            customerId,
            CustomerAccountEntryType.AdjustmentDecrease,
            cancellationToken);

        return openingBalance + dailyDebt + increase - decrease - payment;
    }

    private async Task<decimal> SumEntryTypeAsync(
        Guid customerId,
        CustomerAccountEntryType entryType,
        CancellationToken cancellationToken)
    {
        return await _dbContext.CustomerAccountEntries
            .Where(entry =>
                entry.CustomerId == customerId &&
                entry.EntryType == entryType)
            .SumAsync(
                entry => (decimal?)entry.Amount,
                cancellationToken) ?? 0;
    }

    private CustomerAccountEntry CreateEntry(
        Guid customerId,
        CustomerAccountEntryType entryType,
        decimal amount,
        DateOnly businessDate,
        string? note)
    {
        return new CustomerAccountEntry
        {
            CustomerId = customerId,
            EntryType = entryType,
            Amount = amount,
            BusinessDate = businessDate,
            Note = note,
            RecordedByUserId = _currentUserService.UserId,
            RecordedByFullName = _currentUserService.FullName,
            RecordedByRole = _currentUserService.Role
        };
    }

    private DateOnly GetCurrentBusinessDate()
    {
        var bakuNow = _timeProvider.GetUtcNow().ToOffset(BakuUtcOffset);
        return DateOnly.FromDateTime(bakuNow.DateTime);
    }

    private void EnsureRole(params string[] allowedRoles)
    {
        var currentRole = _currentUserService.Role.ToString();

        if (!allowedRoles.Contains(currentRole, StringComparer.Ordinal))
        {
            throw new ForbiddenException(
                "Bu əməliyyat üçün icazəniz yoxdur.");
        }
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static CustomerAccountEntryDto MapEntry(
        CustomerAccountEntry entry)
    {
        return new CustomerAccountEntryDto
        {
            Id = entry.Id,
            CustomerId = entry.CustomerId,
            EntryType = entry.EntryType,
            Amount = entry.Amount,
            BusinessDate = entry.BusinessDate,
            Note = entry.Note,
            RecordedByUserId = entry.RecordedByUserId,
            RecordedByFullName = entry.RecordedByFullName,
            RecordedByRole = entry.RecordedByRole,
            CreatedAtUtc = entry.CreatedAtUtc
        };
    }
}
