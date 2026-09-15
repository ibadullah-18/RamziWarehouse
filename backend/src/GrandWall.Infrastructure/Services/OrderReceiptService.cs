using Microsoft.EntityFrameworkCore;
using GrandWall.Application.Abstractions.Orders;
using GrandWall.Application.Common.Exceptions;
using GrandWall.Application.Features.Orders.Dtos;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Persistence;

namespace GrandWall.Infrastructure.Services;

public sealed class OrderReceiptService : IOrderReceiptService
{
    private readonly AppDbContext _dbContext;
    private readonly TimeProvider _timeProvider;

    public OrderReceiptService(
        AppDbContext dbContext,
        TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _timeProvider = timeProvider;
    }

    public async Task<OrderReceiptDto> GetReceiptAsync(
        Guid orderId,
        CancellationToken cancellationToken = default)
    {
        var order = await _dbContext.Orders
            .AsNoTracking()
            .Include(order => order.Customer)
            .Include(order => order.Warehouse)
            .Include(order => order.Items)
            .Include(order => order.CreatedByUser)
            .Include(order => order.PreparedByUser)
            .Include(order => order.Delivery)
                .ThenInclude(delivery =>
                    delivery!.DeliveredByUser)
            .SingleOrDefaultAsync(
                order => order.Id == orderId,
                cancellationToken);

        if (order is null)
        {
            throw new NotFoundException(
                "Sifariş tapılmadı.");
        }

        if (order.Status != OrderStatus.Delivered)
        {
            throw new ConflictException(
                "Qəbz yalnız təhvil verilmiş sifariş üçün hazırlana bilər.");
        }

        var delivery = order.Delivery;

        if (delivery is null)
        {
            throw new ConflictException(
                "Sifarişin təhvil məlumatı tapılmadı.");
        }

        if (!delivery.DeliveredAtUtc.HasValue)
        {
            throw new ConflictException(
                "Sifarişin təhvil tarixi tapılmadı.");
        }

        var whatsappNumber = NormalizeWhatsAppNumber(
            order.Customer.PhoneNumber);

        var items = order.Items
            .OrderBy(item => item.CreatedAtUtc)
            .Select((item, index) =>
                new OrderReceiptItemDto
                {
                    LineNumber = index + 1,
                    ProductCode = item.ProductCode,
                    PartyNumber = item.BatchNumber,
                    ProductTypeName =
                        GetProductTypeName(item.ProductType),
                    Quantity = item.Quantity
                })
            .ToArray();

        return new OrderReceiptDto
        {
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            OrderDateUtc = order.OrderDateUtc,

            ReceiptFileName =
                CreateReceiptFileName(order.OrderNumber),

            CustomerName = order.Customer.Name,

            CustomerPhoneNumber =
                order.Customer.PhoneNumber,

            CustomerWhatsAppNumber =
                whatsappNumber,

            WarehouseName = order.Warehouse.Name,

            OrderNote = order.AdditionalNote,

            DeliveryNote = delivery.Note,

            CreatedByFullName =
                order.CreatedByUser.FullName,

            PreparedByFullName =
                order.PreparedByUser?.FullName,

            DeliveredByFullName =
                delivery.DeliveredByUser.FullName,

            DeliveredAtUtc =
                delivery.DeliveredAtUtc.Value,

            GeneratedAtUtc =
                _timeProvider.GetUtcNow().UtcDateTime,

            TotalQuantity =
                items.Sum(item => item.Quantity),

            Items = items
        };
    }

    private static string NormalizeWhatsAppNumber(
        string? phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
        {
            throw new ConflictException(
                "Müştərinin telefon nömrəsi yazılmayıb.");
        }

        var digits = string.Concat(
            phoneNumber.Where(char.IsDigit));

        if (digits.StartsWith(
                "00",
                StringComparison.Ordinal))
        {
            digits = digits[2..];
        }

        if (digits.Length == 10 &&
            digits.StartsWith(
                "0",
                StringComparison.Ordinal))
        {
            digits = $"994{digits[1..]}";
        }
        else if (digits.Length == 9)
        {
            digits = $"994{digits}";
        }

        var isValidAzerbaijanNumber =
            digits.Length == 12 &&
            digits.StartsWith(
                "994",
                StringComparison.Ordinal);

        if (!isValidAzerbaijanNumber)
        {
            throw new ConflictException(
                "Müştərinin telefon nömrəsi düzgün formatda deyil.");
        }

        return digits;
    }

    private static string GetProductTypeName(
        ProductType productType)
    {
        return (int)productType switch
        {
            1 => "Aboy",
            2 => "Vitrin",
            _ => "Digər"
        };
    }

    private static string CreateReceiptFileName(
        string orderNumber)
    {
        var safeOrderNumber = new string(
            orderNumber
                .Where(char.IsLetterOrDigit)
                .ToArray());

        if (string.IsNullOrWhiteSpace(
                safeOrderNumber))
        {
            safeOrderNumber = "sifaris";
        }

        return $"grandwall-qaime-{safeOrderNumber}.pdf";
    }
}