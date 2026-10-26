using GrandWall.Domain.Enums;

namespace GrandWall.Application.Features.CustomerAccounts.Dtos;

// ---------- requests ----------

public sealed class CustomerAccountListQueryDto
{
    public string? Search { get; init; }

    public DateOnly? Date { get; init; }

    public int PageNumber { get; init; } = 1;

    public int PageSize { get; init; } = 50;
}

public sealed class SaveDailyDebtsRequestDto
{
    public List<DailyDebtItemDto> Items { get; init; } = [];
}

public sealed class DailyDebtItemDto
{
    public Guid CustomerId { get; init; }

    /// <summary>Today's new daily debt. Saving the same amount again changes nothing.</summary>
    public decimal DailyDebt { get; init; }

    /// <summary>The customer's old debt, accepted only once, when none has been recorded yet.</summary>
    public decimal? OldDebt { get; init; }
}

public sealed class SettlementReturnDto
{
    public Guid ReturnId { get; init; }

    public decimal Amount { get; init; }
}

public sealed class CompleteSettlementRequest
{
    public Guid OperationId { get; init; }

    public Guid CustomerId { get; init; }

    public decimal Cash { get; init; }

    public decimal Card { get; init; }

    public decimal Bonus { get; init; }

    public List<SettlementReturnDto> Returns { get; init; } = [];

    /// <summary>The unpaid daily debt stays in tomorrow's daily debt instead of becoming old debt.</summary>
    public bool CarryToTomorrow { get; init; }

    public string? Note { get; init; }
}

public sealed class CorrectPreviousDebtRequestDto
{
    public Guid CustomerId { get; init; }

    public decimal CorrectedPreviousDebt { get; init; }

    public string Reason { get; init; } = string.Empty;
}

/// <summary>
/// A detailed debt change for the Sədərək customer page: add to or set the old debt, or add to
/// or set today's daily debt. A reason is always required and is kept in the audit.
/// </summary>
public sealed class AdjustDebtRequestDto
{
    public Guid CustomerId { get; init; }

    /// <summary>"old" or "daily".</summary>
    public string Target { get; init; } = "old";

    /// <summary>"add" (increase by Amount) or "set" (make the debt equal to Amount).</summary>
    public string Mode { get; init; } = "add";

    public decimal Amount { get; init; }

    public string Reason { get; init; } = string.Empty;
}

public sealed class CorrectDailyDebtRequestDto
{
    public DateOnly? Date { get; init; }

    public Guid CustomerId { get; init; }

    public decimal Amount { get; init; }

    public string Reason { get; init; } = string.Empty;
}

public sealed class CorrectAccountPaymentRequestDto
{
    public Guid CustomerId { get; init; }

    public Guid EntryId { get; init; }

    public decimal ExpectedAmount { get; init; }

    public string? ExpectedPaymentMethod { get; init; }

    public decimal Amount { get; init; }

    public string PaymentMethod { get; init; } = "cash";

    public string Reason { get; init; } = string.Empty;
}

// ---------- responses ----------

public sealed class AccountDayCustomerDto
{
    public Guid CustomerId { get; init; }

    public string CustomerName { get; init; } = string.Empty;

    public string? PhoneNumber { get; init; }

    /// <summary>Köhnə borc owed when the day began (plus any old debt added today).</summary>
    public decimal OldDebt { get; init; }

    /// <summary>"Günlük köhnə": yesterday's daily debt that was kept for tomorrow. Zero unless it was kept.</summary>
    public decimal CarriedDebt { get; init; }

    /// <summary>The new daily debt written today.</summary>
    public decimal TodayDebt { get; init; }

    public decimal Due => OldDebt + CarriedDebt + TodayDebt;

    public decimal Cash { get; init; }

    public decimal Card { get; init; }

    public decimal Paid => Cash + Card;

    public decimal Bonus { get; init; }

    public decimal ReturnCredit { get; init; }

    public decimal RemainingOld { get; init; }

    public decimal RemainingCarried { get; init; }

    public decimal RemainingToday { get; init; }

    public decimal Remaining => RemainingOld + RemainingCarried + RemainingToday;

    public decimal Advance { get; init; }

    /// <summary>The customer's açot was finished for this day ("+", green).</summary>
    public bool IsDone { get; init; }

    public bool CarryToTomorrow { get; init; }

    public bool HasOldDebtRecord { get; init; }
}

public sealed class AccountDayDto
{
    public DateOnly BusinessDate { get; init; }

    /// <summary>notStarted, open or closed.</summary>
    public string State { get; init; } = "notStarted";

    public bool IsToday { get; init; }

    /// <summary>A past day: only an admin may correct it.</summary>
    public bool IsLocked { get; init; }

    public string? StartedByFullName { get; init; }

    public DateTime? StartedAtUtc { get; init; }

    public string? ClosedByFullName { get; init; }

    public DateTime? ClosedAtUtc { get; init; }

    public decimal Collected { get; init; }

    public decimal Cash { get; init; }

    public decimal Card { get; init; }

    public decimal Bonus { get; init; }

    public decimal ReturnCredit { get; init; }

    public decimal NewDailyDebt { get; init; }

    public int CustomerCount { get; init; }

    public int DoneCount { get; init; }

    public IReadOnlyList<AccountDayCustomerDto> Customers { get; init; } = [];
}

public sealed class CustomerAccountSummaryDto
{
    public Guid CustomerId { get; init; }

    public string CustomerName { get; init; } = string.Empty;

    public string? PhoneNumber { get; init; }

    public bool IsActive { get; init; }

    public bool IsAccountCustomer { get; init; }

    public decimal OldDebt { get; init; }

    public decimal CarriedDebt { get; init; }

    public decimal TodayDebt { get; init; }

    public decimal Advance { get; init; }

    public decimal RemainingDebt => OldDebt + CarriedDebt + TodayDebt;

    public bool HasOldDebtRecord { get; init; }
}

public sealed class CustomerAccountListDto
{
    public IReadOnlyList<CustomerAccountSummaryDto> Items { get; init; } = [];

    public DateOnly BusinessDate { get; init; }

    public int PageNumber { get; init; }

    public int PageSize { get; init; }

    public int TotalCount { get; init; }
}

public sealed class CustomerAccountEntryDto
{
    public Guid Id { get; init; }

    public Guid CustomerId { get; init; }

    public CustomerAccountEntryType EntryType { get; init; }

    public string? PaymentMethod { get; init; }

    public decimal Amount { get; init; }

    public DateOnly BusinessDate { get; init; }

    public string? Note { get; init; }

    public string RecordedByFullName { get; init; } = string.Empty;

    public DateTime CreatedAtUtc { get; init; }
}

public sealed class CustomerAccountDayDto
{
    public DateOnly BusinessDate { get; init; }

    public decimal OldDebt { get; init; }

    public decimal CarriedDebt { get; init; }

    public decimal TodayDebt { get; init; }

    public decimal Cash { get; init; }

    public decimal Card { get; init; }

    public decimal Bonus { get; init; }

    public decimal ReturnCredit { get; init; }

    public decimal RemainingDebt { get; init; }

    public bool IsLocked { get; init; }

    public IReadOnlyList<CustomerAccountEntryDto> Entries { get; init; } = [];
}

public sealed record AccountAuditDto(Guid EntryId, string UserName, string Description, DateTime CreatedAtUtc);

public sealed class CustomerAccountDetailsDto
{
    public Guid CustomerId { get; init; }

    public string CustomerName { get; init; } = string.Empty;

    public string? PhoneNumber { get; init; }

    public bool IsActive { get; init; }

    public decimal OldDebt { get; init; }

    public decimal CarriedDebt { get; init; }

    public decimal TodayDebt { get; init; }

    public decimal Advance { get; init; }

    public decimal RemainingDebt => OldDebt + CarriedDebt + TodayDebt;

    public bool HasOldDebtRecord { get; init; }

    public IReadOnlyList<AccountAuditDto> Audit { get; init; } = [];

    public IReadOnlyList<CustomerAccountDayDto> Days { get; init; } = [];
}

public sealed record AccountHistoryDayDto(
    DateOnly BusinessDate,
    decimal Collected,
    decimal Cash,
    decimal Card,
    int CustomerCount,
    bool Closed);

public sealed class AccountHistoryMonthDto
{
    public string Month { get; init; } = string.Empty;

    public decimal Collected { get; init; }

    public decimal Cash { get; init; }

    public decimal Card { get; init; }

    public IReadOnlyList<AccountHistoryDayDto> Days { get; init; } = [];
}

public sealed record CustomerMonthDayDto(
    DateOnly BusinessDate,
    decimal OldDebt,
    decimal CarriedDebt,
    decimal TodayDebt,
    decimal Cash,
    decimal Card,
    decimal Bonus,
    decimal ReturnCredit,
    decimal Remaining);

public sealed class CustomerMonthDto
{
    public Guid CustomerId { get; init; }

    public string CustomerName { get; init; } = string.Empty;

    public string Month { get; init; } = string.Empty;

    public decimal Collected { get; init; }

    public decimal Cash { get; init; }

    public decimal Card { get; init; }

    public decimal Bonus { get; init; }

    public decimal ReturnCredit { get; init; }

    public decimal Remaining { get; init; }

    public IReadOnlyList<CustomerMonthDayDto> Days { get; init; } = [];
}
