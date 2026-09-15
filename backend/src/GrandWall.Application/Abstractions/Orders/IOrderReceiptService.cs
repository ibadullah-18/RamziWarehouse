using GrandWall.Application.Features.Orders.Dtos;

namespace GrandWall.Application.Abstractions.Orders;

public interface IOrderReceiptService
{
    Task<OrderReceiptDto> GetReceiptAsync(
        Guid orderId,
        CancellationToken cancellationToken = default);
}