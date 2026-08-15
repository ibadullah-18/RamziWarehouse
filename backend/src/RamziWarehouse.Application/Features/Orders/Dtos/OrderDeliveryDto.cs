namespace RamziWarehouse.Application.Features.Orders.Dtos;

public sealed class OrderDeliveryDto
{
    public Guid Id { get; init; }

    public Guid OrderId { get; init; }

    public Guid DeliveredByUserId { get; init; }

    public string DeliveredByFullName { get; init; }
        = string.Empty;

    public DateTime StartedAtUtc { get; init; }

    public DateTime? DeliveredAtUtc { get; init; }

    public string? Note { get; init; }

    public IReadOnlyCollection<DeliveryPhotoDto> Photos
    {
        get;
        init;
    } = Array.Empty<DeliveryPhotoDto>();
}