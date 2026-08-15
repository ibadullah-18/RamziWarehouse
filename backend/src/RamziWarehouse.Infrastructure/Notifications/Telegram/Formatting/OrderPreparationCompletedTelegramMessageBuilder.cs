using System.Globalization;
using System.Text;
using RamziWarehouse.Domain.Entities;
using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Infrastructure.Notifications.Telegram.Formatting;

internal static class
    OrderPreparationCompletedTelegramMessageBuilder
{
    private const int MaximumMessageLength = 3900;

    public static IReadOnlyList<string> Build(
        Order order,
        IReadOnlyCollection<OrderItem> items,
        string customerName,
        string warehouseName,
        string preparedByFullName,
        DateTime preparedAtUtc,
        int photoCount)
    {
        ArgumentNullException.ThrowIfNull(order);
        ArgumentNullException.ThrowIfNull(items);

        var builder = new StringBuilder();

        builder.AppendLine("✅ SİFARİŞ HAZIRLANDI");
        builder.AppendLine();

        builder.AppendLine(
            $"Qaimə №: {NormalizeInline(order.OrderNumber)}");

        builder.AppendLine(
            $"Müştəri: {NormalizeInline(customerName)}");

        builder.AppendLine(
            $"Anbar: {NormalizeInline(warehouseName)}");

        builder.AppendLine(
            $"Hazırlayan: {NormalizeInline(preparedByFullName)}");

        builder.AppendLine(
            $"Hazırlanma tarixi: " +
            preparedAtUtc.ToString(
                "dd.MM.yyyy HH:mm 'UTC'",
                CultureInfo.InvariantCulture));

        builder.AppendLine(
            $"Sübut şəkilləri: {photoCount} ədəd");

        builder.AppendLine();
        builder.AppendLine("Hazırlanan məhsullar:");

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
                : $"✅ SİFARİŞ DAVAMI — " +
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

            messages.Add(
                prefix +
                remainingText[..splitIndex].Trim());

            remainingText = remainingText[splitIndex..]
                .TrimStart('\r', '\n', ' ');
        }

        return messages;
    }
}