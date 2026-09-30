using GrandWall.Application.Features.CustomerAccounts.Dtos;

namespace GrandWall.Application.Abstractions.CustomerAccounts;

public interface ICustomerAccountService
{
    Task<CustomerAccountDetailsDto> CorrectDailyAsync(CorrectDailyDebtRequestDto request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AccountReportHistoryDto>> GetReportHistoryAsync(CancellationToken cancellationToken = default);
    Task<AccountDayReportDto> GetReportAsync(DateOnly date, CancellationToken cancellationToken = default);
    Task<AccountDayReportDto> CloseDayAsync(CancellationToken cancellationToken = default);
    Task<CustomerAccountListDto> GetAllAsync(
        CustomerAccountListQueryDto query,
        CancellationToken cancellationToken = default);

    Task<CustomerAccountDetailsDto> GetByCustomerIdAsync(
        Guid customerId,
        CancellationToken cancellationToken = default);

    Task<CustomerAccountDetailsDto> CreateTodayAsync(
        CreateCustomerAccountRequestDto request,
        CancellationToken cancellationToken = default);

    Task<CustomerAccountDetailsDto> RecordPaymentAsync(
        RecordCustomerPaymentRequestDto request,
        CancellationToken cancellationToken = default);

    Task<CustomerAccountDetailsDto> CorrectPreviousDebtAsync(
        CorrectPreviousDebtRequestDto request,
        CancellationToken cancellationToken = default);
}
