using GrandWall.Application.Common.Models;
using GrandWall.Application.Features.Orders.Dtos;

namespace GrandWall.Application.Abstractions.Orders;

public interface IOrderService
{
    Task<PagedResultDto<OrderListItemDto>> GetAllAsync(
        OrderQueryDto query,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ProductSuggestionDto>>
        GetProductSuggestionsAsync(
            string? search,
            int take,
            CancellationToken cancellationToken = default);

    Task<OrderDto> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<OrderDto> CreateAsync(
        CreateOrderRequestDto request,
        CancellationToken cancellationToken = default);

    Task<OrderDto> StartPreparationAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<OrderDto> CancelAsync(
        Guid id,
        CancelOrderRequestDto request,
        CancellationToken cancellationToken = default);
}