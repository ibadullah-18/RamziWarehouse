using System.Globalization;
using System.Text;
using RamziWarehouse.Domain.Entities;
using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Infrastructure.Notifications.Telegram.Formatting;

internal static class ProductReturnProcessedTelegramMessageBuilder
{
    private const int MaximumMessageLength = 3900;

    public static IReadOnlyList<string> Build(
        ProductReturn productReturn,
        IReadOnlyCollection<ProductReturnItem> items,
        string customerName,
        string warehouseName,
        string processedByFullName,
        DateTime processedAtUtc,
        string? processNote,
        int photoCount)
    {
        ArgumentNullException.ThrowIfNull(productReturn);
        ArgumentNullException.ThrowIfNull(items);

        var builder = new StringBuilder();

        builder.AppendLine(
            GetTitle(productReturn.Status, items));

        builder.AppendLine();

        builder.AppendLine(
            $"Müştəri: {NormalizeInline(customerName)}");

        builder.AppendLine(
            $"Anbar: {NormalizeInline(warehouseName)}");

        builder.AppendLine(
            $"Əməliyyatı edən: " +
            $"{NormalizeInline(processedByFullName)}");

        builder.AppendLine(
            $"Əməliyyat tarixi: " +
            processedAtUtc.ToString(
                "dd.MM.yyyy HH:mm 'UTC'",
                CultureInfo.InvariantCulture));

        builder.AppendLine(
            $"Nəticə: {GetStatusName(productReturn.Status)}");

        builder.AppendLine(
            $"Sübut şəkilləri: {photoCount} ədəd");

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
            $"İşçinin qeydi: " +
            $"{GetNote(productReturn.AdditionalNote)}");

        builder.AppendLine(
            $"Menecer qeydi: {GetNote(processNote)}");

        return SplitIntoChunks(
            builder.ToString(),
            customerName,
            productReturn.Status);
    }

    private static string GetTitle(
        ReturnStatus status,
        IReadOnlyCollection<ProductReturnItem> items)
    {
        var returnTypeName = GetReturnTypeName(items);

        return status switch
        {
            ReturnStatus.Completed =>
                $"✅ {returnTypeName} TAMAMLANDI",

            ReturnStatus.Cancelled =>
                $"❌ {returnTypeName} LƏĞV EDİLDİ",

            _ => throw new ArgumentOutOfRangeException(
                nameof(status),
                status,
                "Unsupported return status.")
        };
    }

    private static string GetReturnTypeName(
        IReadOnlyCollection<ProductReturnItem> items)
    {
        var hasProduct = items.Any(
            item => item.ProductType == ProductType.Product);

        var hasShowcase = items.Any(
            item => item.ProductType == ProductType.Showcase);

        if (hasProduct && hasShowcase)
        {
            return "VAZVRAD VƏ VİTRİN";
        }

        if (hasShowcase)
        {
            return "VİTRİN";
        }

        return "VAZVRAD";
    }

    private static string GetStatusName(ReturnStatus status)
    {
        return status switch
        {
            ReturnStatus.Completed => "Tamamlandı",
            ReturnStatus.Cancelled => "Ləğv edildi",
            _ => "Naməlum"
        };
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
        string customerName,
        ReturnStatus status)
    {
        var messages = new List<string>();
        var remainingText = text.Trim();

        while (remainingText.Length > 0)
        {
            var prefix = messages.Count == 0
                ? string.Empty
                : $"{GetContinuationTitle(status)} — " +
                  $"{NormalizeInline(customerName)}\n\n";

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

    private static string GetContinuationTitle(
        ReturnStatus status)
    {
        return status switch
        {
            ReturnStatus.Completed =>
                "✅ VAZVRAD NƏTİCƏSİNİN DAVAMI",

            ReturnStatus.Cancelled =>
                "❌ VAZVRAD NƏTİCƏSİNİN DAVAMI",

            _ => "VAZVRAD DAVAMI"
        };
    }
}