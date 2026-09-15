using GrandWall.Domain.Enums;

namespace GrandWall.Application.Features.Orders.Dtos;

public sealed class OrderStatusHistoryDto
{
    public Guid Id { get; init; }

    public OrderStatus? PreviousStatus { get; init; }

    public OrderStatus NewStatus { get; init; }

    public Guid ChangedByUserId { get; init; }

    public string ChangedByFullName { get; init; } = string.Empty;

    public string? Note { get; init; }

    public DateTime ChangedAtUtc { get; init; }
}