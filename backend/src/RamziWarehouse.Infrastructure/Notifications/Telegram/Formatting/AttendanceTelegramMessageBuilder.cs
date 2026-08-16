using System.Globalization;

namespace RamziWarehouse.Infrastructure.Notifications.Telegram.Formatting;

internal static class AttendanceTelegramMessageBuilder
{
    private static readonly TimeZoneInfo BakuTimeZone =
        ResolveBakuTimeZone();

    public static string BuildCheckIn(
        string fullName,
        DateOnly workDate,
        DateTime checkedInAtUtc)
    {
        var localTime = ConvertToBakuTime(
            checkedInAtUtc);

        return
            "🟢 İŞƏ GİRİŞ\n\n" +
            $"İşçi: {NormalizeInline(fullName)}\n" +
            $"Tarix: {workDate:dd.MM.yyyy}\n" +
            $"Saat: {localTime:HH:mm}\n" +
            "Vəziyyət: İşdədir";
    }

    public static string BuildCheckOut(
        string fullName,
        DateOnly workDate,
        DateTime checkedInAtUtc,
        DateTime checkedOutAtUtc)
    {
        var checkedInLocal =
            ConvertToBakuTime(checkedInAtUtc);

        var checkedOutLocal =
            ConvertToBakuTime(checkedOutAtUtc);

        var duration =
            checkedOutAtUtc - checkedInAtUtc;

        var totalHours =
            (int)duration.TotalHours;

        return
            "🔴 İŞDƏN ÇIXIŞ\n\n" +
            $"İşçi: {NormalizeInline(fullName)}\n" +
            $"Tarix: {workDate:dd.MM.yyyy}\n" +
            $"Giriş saatı: {checkedInLocal:HH:mm}\n" +
            $"Çıxış saatı: {checkedOutLocal:HH:mm}\n" +
            $"İş müddəti: {totalHours} saat " +
            $"{duration.Minutes} dəqiqə\n" +
            "Vəziyyət: İşdən çıxıb";
    }

    private static DateTime ConvertToBakuTime(
        DateTime utcDateTime)
    {
        var normalizedUtc = DateTime.SpecifyKind(
            utcDateTime,
            DateTimeKind.Utc);

        return TimeZoneInfo.ConvertTimeFromUtc(
            normalizedUtc,
            BakuTimeZone);
    }

    private static TimeZoneInfo ResolveBakuTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(
                "Asia/Baku");
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById(
                "Azerbaijan Standard Time");
        }
    }

    private static string NormalizeInline(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "Naməlum";
        }

        return value
            .Replace("\r", " ")
            .Replace("\n", " ")
            .Trim();
    }
}