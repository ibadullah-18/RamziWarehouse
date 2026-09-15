using System.Globalization;
using System.Text;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;

namespace GrandWall.Infrastructure.Notifications.Telegram.Formatting;

internal static class OrderCreatedTelegramMessageBuilder
{
    private const int MaximumMessageLength = 3900;

    public static IReadOnlyList<string> Build(
        Order order,
        IReadOnlyCollection<OrderItem> items,
        string customerName,
        string warehouseName,
        string createdByFullName)
    {
        ArgumentNullException.ThrowIfNull(order);
        ArgumentNullException.ThrowIfNull(items);

        var builder = new StringBuilder();

        builder.AppendLine("🧾 YENİ SİFARİŞ");
        builder.AppendLine();
        builder.AppendLine(
            $"Qaimə №: {NormalizeInline(order.OrderNumber)}");

        builder.AppendLine(
            $"Tarix: {order.OrderDateUtc.ToString(
                "dd.MM.yyyy",
                CultureInfo.InvariantCulture)}");

        builder.AppendLine(
            $"Müştəri: {NormalizeInline(customerName)}");

        builder.AppendLine(
            $"Anbar: {NormalizeInline(warehouseName)}");

        builder.AppendLine(
            $"Yaradan: {NormalizeInline(createdByFullName)}");

        builder.AppendLine();
        builder.AppendLine("Məhsullar:");

        var itemNumber = 1;

        foreach (var item in items)
        {
            builder.AppendLine(
                $"{itemNumber}. " +
                $"Kod: {NormalizeInline(item.ProductCode)} | " +
                $"Partiya: {NormalizeInline(item.BatchNumber)} | " +
                $"Növ: {GetProductTypeName(item.ProductType)} | " +
                $"Say: {item.Quantity} ədəd");

            itemNumber++;
        }

        builder.AppendLine();
        builder.AppendLine(
            $"Əlavə qeyd: {GetNote(order.AdditionalNote)}");

        return SplitIntoChunks(
            builder.ToString(),
            order.OrderNumber);
    }

    private static string GetProductTypeName(
        ProductType productType)
    {
        return productType switch
        {
            ProductType.Product => "Aboy",
            ProductType.Showcase => "Vitrin",
            _ => "Naməlum"
        };
    }

    private static string GetNote(string? note)
    {
        return string.IsNullOrWhiteSpace(note)
            ? "Yoxdur"
            : NormalizeInline(note);
    }

    private static string NormalizeInline(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "Yoxdur";
        }

        return value
            .Replace("\r", " ")
            .Replace("\n", " ")
            .Trim();
    }

    private static IReadOnlyList<string> SplitIntoChunks(
        string text,
        string orderNumber)
    {
        var messages = new List<string>();
        var remainingText = text.Trim();

        while (remainingText.Length > 0)
        {
            var prefix = messages.Count == 0
                ? string.Empty
                : $"🧾 SİFARİŞ DAVAMI — " +
                  $"{NormalizeInline(orderNumber)}\n\n";

            var availableLength =
                MaximumMessageLength - prefix.Length;

            if (remainingText.Length <= availableLength)
            {
                messages.Add(prefix + remainingText);
                break;
            }

            var splitIndex = remainingText.LastIndexOf(
                '\n',
                availableLength);

            if (splitIndex <= 0)
            {
                splitIndex = availableLength;
            }

            var currentPart = remainingText[..splitIndex]
                .Trim();

            messages.Add(prefix + currentPart);

            remainingText = remainingText[splitIndex..]
                .TrimStart('\r', '\n', ' ');
        }

        return messages;
    }
}