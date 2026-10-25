using GrandWall.Application.Features.CustomerAccounts.Dtos;

namespace GrandWall.Application.Abstractions.CustomerAccounts;

public interface ICustomerAccountService
{
    Task<AccountDayDto> GetDayAsync(DateOnly date, CancellationToken cancellationToken = default);

    Task<AccountDayDto> StartDayAsync(CancellationToken cancellationToken = default);

    Task<AccountDayDto> SaveDailyDebtsAsync(SaveDailyDebtsRequestDto request, CancellationToken cancellationToken = default);

    Task<AccountDayDto> CloseDayAsync(CancellationToken cancellationToken = default);

    Task<CustomerAccountDetailsDto> CompleteSettlementAsync(CompleteSettlementRequest request, CancellationToken cancellationToken = default);

    Task<AccountHistoryMonthDto> GetHistoryAsync(string month, CancellationToken cancellationToken = default);

    Task<CustomerMonthDto> GetCustomerMonthAsync(Guid customerId, string month, CancellationToken cancellationToken = default);

    Task<CustomerAccountListDto> GetAllAsync(CustomerAccountListQueryDto query, CancellationToken cancellationToken = default);

    Task<CustomerAccountDetailsDto> GetByCustomerIdAsync(Guid customerId, CancellationToken cancellationToken = default);

    Task<CustomerAccountDetailsDto> CorrectPaymentAsync(CorrectAccountPaymentRequestDto request, CancellationToken cancellationToken = default);

    Task<CustomerAccountDetailsDto> CorrectDailyAsync(CorrectDailyDebtRequestDto request, CancellationToken cancellationToken = default);

    Task<CustomerAccountDetailsDto> CorrectPreviousDebtAsync(CorrectPreviousDebtRequestDto request, CancellationToken cancellationToken = default);
}
