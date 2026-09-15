using GrandWall.Application.Features.CustomerAccounts.Dtos;

namespace GrandWall.Application.Abstractions.CustomerAccounts;

public interface ICustomerAccountService
{
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
