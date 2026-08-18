using RamziWarehouse.Application.Features.Orders.Dtos;

namespace RamziWarehouse.Application.Abstractions.Orders;

public interface IOrderReceiptService
{
    Task<OrderReceiptDto> GetReceiptAsync(
        Guid orderId,
        CancellationToken cancellationToken = default);
}