namespace GrandWall.Application.Features.CustomerAccounts.Dtos;
public sealed record CompleteSettlementRequest(Guid OperationId,Guid CustomerId,decimal Cash,decimal Card,decimal Bonus,Guid? ProductReturnId,string? Note);
