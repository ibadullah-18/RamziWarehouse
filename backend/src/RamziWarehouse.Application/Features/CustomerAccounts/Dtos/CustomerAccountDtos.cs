using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Application.Features.CustomerAccounts.Dtos;

public sealed class CustomerAccountListQueryDto
{
    public string? Search { get; init; }

    public DateOnly? Date { get; init; }

    public int PageNumber { get; init; } = 1;

    public int PageSize { get; init; } = 30;
}

public sealed class CreateCustomerAccountRequestDto
{
    public Guid CustomerId { get; init; }

    public decimal? InitialPreviousDebt { get; init; }

    public decimal TodayDebt { get; init; }

    public string? Note { get; init; }
}

public sealed class RecordCustomerPaymentRequestDto
{
    public Guid CustomerId { get; init; }

    public decimal Amount { get; init; }

    public string? Note { get; init; }
}

public sealed class CorrectPreviousDebtRequestDto
{
    public Guid CustomerId { get; init; }

    public decimal CorrectedPreviousDebt { get; init; }

    public string Reason { get; init; } = string.Empty;
}

public sealed class CustomerAccountEntryDto
{
    public Guid Id { get; init; }

    public Guid CustomerId { get; init; }

    public CustomerAccountEntryType EntryType { get; init; }

    public decimal Amount { get; init; }

    public DateOnly BusinessDate { get; init; }

    public string? Note { get; init; }

    public Guid RecordedByUserId { get; init; }

    public string RecordedByFullName { get; init; } = string.Empty;

    public UserRole RecordedByRole { get; init; }

    public DateTime CreatedAtUtc { get; init; }
}

public sealed class CustomerAccountSummaryDto
{
    public Guid CustomerId { get; init; }

    public string CustomerName { get; init; } = string.Empty;

    public string? PhoneNumber { get; init; }

    public bool IsActive { get; init; }

    public DateOnly BusinessDate { get; init; }

    public decimal PreviousDebt { get; init; }

    public decimal TodayDebt { get; init; }

    public decimal TodayPayment { get; init; }

    public decimal PaidFromPreviousDebt { get; init; }

    public decimal PaidFromTodayDebt { get; init; }

    public decimal PreviousDebtRemaining { get; init; }

    public decimal TodayDebtRemaining { get; init; }

    public decimal RemainingDebt { get; init; }
}

public sealed class CustomerAccountListDto
{
    public IReadOnlyList<CustomerAccountSummaryDto> Items
        { get; init; } = [];

    public DateOnly BusinessDate { get; init; }

    public int PageNumber { get; init; }

    public int PageSize { get; init; }

    public int TotalCount { get; init; }
}

public sealed class CustomerAccountDayDto
{
    public DateOnly BusinessDate { get; init; }

    public decimal OpeningDebt { get; init; }

    public decimal AdjustmentAmount { get; init; }

    public decimal AddedDebt { get; init; }

    public decimal PaidAmount { get; init; }

    public decimal ClosingDebt { get; init; }

    public IReadOnlyList<CustomerAccountEntryDto> Entries
        { get; init; } = [];
}

public sealed class CustomerAccountDetailsDto
{
    public Guid CustomerId { get; init; }

    public string CustomerName { get; init; } = string.Empty;

    public string? PhoneNumber { get; init; }

    public bool IsActive { get; init; }

    public decimal PreviousDebt { get; init; }

    public decimal TotalNewDebt { get; init; }

    public decimal TotalDebt { get; init; }

    public decimal TotalPaid { get; init; }

    public decimal RemainingDebt { get; init; }

    public IReadOnlyList<CustomerAccountDayDto> Days
        { get; init; } = [];
}
