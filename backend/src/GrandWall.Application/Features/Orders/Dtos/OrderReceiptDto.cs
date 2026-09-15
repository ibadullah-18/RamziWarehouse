namespace GrandWall.Application.Features.Orders.Dtos;

public sealed class OrderReceiptDto
{
    public Guid OrderId { get; init; }

    public string OrderNumber { get; init; } = string.Empty;

    public DateTime OrderDateUtc { get; init; }

    public string ReceiptFileName { get; init; } = string.Empty;

    public string CustomerName { get; init; } = string.Empty;

    public string CustomerPhoneNumber { get; init; } = string.Empty;

    public string CustomerWhatsAppNumber { get; init; } = string.Empty;

    public string WarehouseName { get; init; } = string.Empty;

    public string? OrderNote { get; init; }

    public string? DeliveryNote { get; init; }

    public string CreatedByFullName { get; init; } = string.Empty;

    public string? PreparedByFullName { get; init; }

    public string DeliveredByFullName { get; init; } = string.Empty;

    public DateTime DeliveredAtUtc { get; init; }

    public DateTime GeneratedAtUtc { get; init; }

    public int TotalQuantity { get; init; }

    public IReadOnlyCollection<OrderReceiptItemDto> Items { get; init; }
        = [];
}

public sealed class OrderReceiptItemDto
{
    public int LineNumber { get; init; }

    public string ProductCode { get; init; } = string.Empty;

    public string PartyNumber { get; init; } = string.Empty;

    public string ProductTypeName { get; init; } = string.Empty;

    public int Quantity { get; init; }
}