using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Options;
using RamziWarehouse.Application.Abstractions.Notifications;
using RamziWarehouse.Application.Common.Notifications;

namespace RamziWarehouse.Infrastructure.Notifications.Telegram;

public sealed class TelegramNotificationService
    : ITelegramNotificationService
{
    private const int MaximumMessageLength = 4000;

    private readonly HttpClient _httpClient;
    private readonly TelegramSettings _settings;

    public TelegramNotificationService(
        HttpClient httpClient,
        IOptions<TelegramSettings> settings)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
    }

    public async Task SendTextAsync(
        TelegramChannel channel,
        string message,
        CancellationToken cancellationToken = default)
    {
        if (!_settings.Enabled)
        {
            throw new InvalidOperationException(
                "Telegram bildirişləri aktiv deyil.");
        }

        if (string.IsNullOrWhiteSpace(message))
        {
            throw new ArgumentException(
                "Telegram mesajı boş ola bilməz.",
                nameof(message));
        }

        message = message.Trim();

        if (message.Length > MaximumMessageLength)
        {
            throw new ArgumentException(
                $"Telegram mesajı {MaximumMessageLength} simvoldan çox ola bilməz.",
                nameof(message));
        }

        var channelSettings = GetChannelSettings(channel);

        ValidateChannelSettings(
            channel,
            channelSettings);

        using var content = new FormUrlEncodedContent(
            new Dictionary<string, string>
            {
                ["chat_id"] = channelSettings.ChatId.ToString(
                    CultureInfo.InvariantCulture),

                ["text"] = message
            });

        var requestUri = new Uri(
            $"./bot{channelSettings.BotToken}/sendMessage",
            UriKind.Relative);

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            requestUri)
        {
            Content = content
        };

        using var response = await _httpClient.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);

        var responseBody = await response.Content.ReadAsStringAsync(
            cancellationToken);

        TelegramApiResponse? telegramResponse;

        try
        {
            telegramResponse =
                JsonSerializer.Deserialize<TelegramApiResponse>(
                    responseBody,
                    new JsonSerializerOptions(
                        JsonSerializerDefaults.Web));
        }
        catch (JsonException)
        {
            throw new InvalidOperationException(
                "Telegram serverindən düzgün cavab alınmadı.");
        }

        if (!response.IsSuccessStatusCode ||
            telegramResponse is null ||
            !telegramResponse.Ok)
        {
            var description =
                telegramResponse?.Description ??
                "Naməlum Telegram xətası.";

            throw new InvalidOperationException(
                $"Telegram mesajı göndərilmədi: {description}");
        }
    }

    private TelegramChannelSettings GetChannelSettings(
        TelegramChannel channel)
    {
        return channel switch
        {
            TelegramChannel.Orders => _settings.Orders,
            TelegramChannel.Returns => _settings.Returns,
            TelegramChannel.Delivery => _settings.Delivery,

            _ => throw new ArgumentOutOfRangeException(
                nameof(channel),
                channel,
                "Düzgün Telegram kanalı seçilməyib.")
        };
    }

    private static void ValidateChannelSettings(
        TelegramChannel channel,
        TelegramChannelSettings channelSettings)
    {
        if (string.IsNullOrWhiteSpace(
                channelSettings.BotToken))
        {
            throw new InvalidOperationException(
                $"{channel} bot tokeni konfiqurasiya edilməyib.");
        }

        if (channelSettings.ChatId == 0)
        {
            throw new InvalidOperationException(
                $"{channel} ChatId konfiqurasiya edilməyib.");
        }
    }

    private sealed class TelegramApiResponse
    {
        public bool Ok { get; init; }

        public string? Description { get; init; }
    }
}