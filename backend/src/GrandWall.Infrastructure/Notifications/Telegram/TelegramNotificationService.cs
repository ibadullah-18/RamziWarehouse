using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using GrandWall.Application.Abstractions.Notifications;
using GrandWall.Application.Common.Notifications;

namespace GrandWall.Infrastructure.Notifications.Telegram;

public sealed class TelegramNotificationService
    : ITelegramNotificationService
{
    private const int MaximumMessageLength = 4000;
    private const int MaximumMediaGroupSize = 10;

    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

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
        var channelSettings =
            GetValidatedChannelSettings(channel);

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
                $"Telegram mesajı {MaximumMessageLength} " +
                "simvoldan çox ola bilməz.",
                nameof(message));
        }

        using var content = new FormUrlEncodedContent(
            new Dictionary<string, string>
            {
                ["chat_id"] =
                    channelSettings.ChatId.ToString(
                        CultureInfo.InvariantCulture),

                ["text"] = message
            });

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            CreateRequestUri(
                channelSettings.BotToken,
                "sendMessage"))
        {
            Content = content
        };

        await SendRequestAsync(
            request,
            cancellationToken);
    }

    public async Task SendPhotosAsync(
        TelegramChannel channel,
        IReadOnlyCollection<TelegramPhotoContent> photos,
        CancellationToken cancellationToken = default)
    {
        var channelSettings =
            GetValidatedChannelSettings(channel);

        if (photos is null || photos.Count == 0)
        {
            throw new ArgumentException(
                "Ən azı bir Telegram şəkli olmalıdır.",
                nameof(photos));
        }

        var normalizedPhotos = photos
            .Select(NormalizePhoto)
            .ToList();

        for (
            var startIndex = 0;
            startIndex < normalizedPhotos.Count;
            startIndex += MaximumMediaGroupSize)
        {
            var photoBatch = normalizedPhotos
                .Skip(startIndex)
                .Take(MaximumMediaGroupSize)
                .ToList();

            if (photoBatch.Count == 1)
            {
                await SendSinglePhotoAsync(
                    channelSettings,
                    photoBatch[0],
                    cancellationToken);
            }
            else
            {
                await SendPhotoGroupAsync(
                    channelSettings,
                    photoBatch,
                    cancellationToken);
            }
        }
    }

    private async Task SendSinglePhotoAsync(
        TelegramChannelSettings channelSettings,
        TelegramPhotoContent photo,
        CancellationToken cancellationToken)
    {
        using var content = new MultipartFormDataContent();

        content.Add(
            new StringContent(
                channelSettings.ChatId.ToString(
                    CultureInfo.InvariantCulture)),
            "chat_id");

        var fileContent =
            CreateFileContent(photo);

        content.Add(
            fileContent,
            "photo",
            photo.FileName);

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            CreateRequestUri(
                channelSettings.BotToken,
                "sendPhoto"))
        {
            Content = content
        };

        await SendRequestAsync(
            request,
            cancellationToken);
    }

    private async Task SendPhotoGroupAsync(
        TelegramChannelSettings channelSettings,
        IReadOnlyList<TelegramPhotoContent> photos,
        CancellationToken cancellationToken)
    {
        using var content = new MultipartFormDataContent();

        content.Add(
            new StringContent(
                channelSettings.ChatId.ToString(
                    CultureInfo.InvariantCulture)),
            "chat_id");

        var media = photos
            .Select(
                (_, index) =>
                    new Dictionary<string, string>
                    {
                        ["type"] = "photo",
                        ["media"] = $"attach://photo{index}"
                    })
            .ToList();

        var mediaJson = JsonSerializer.Serialize(
            media,
            JsonOptions);

        content.Add(
            new StringContent(
                mediaJson,
                Encoding.UTF8,
                "application/json"),
            "media");

        for (var index = 0; index < photos.Count; index++)
        {
            var photo = photos[index];

            var fileContent =
                CreateFileContent(photo);

            content.Add(
                fileContent,
                $"photo{index}",
                photo.FileName);
        }

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            CreateRequestUri(
                channelSettings.BotToken,
                "sendMediaGroup"))
        {
            Content = content
        };

        await SendRequestAsync(
            request,
            cancellationToken);
    }

    private async Task SendRequestAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        HttpResponseMessage response;

        try
        {
            response = await _httpClient.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);
        }
        catch (OperationCanceledException)
            when (!cancellationToken.IsCancellationRequested)
        {
            throw new InvalidOperationException(
                "Telegram sorğusunun vaxtı bitdi.");
        }
        catch (HttpRequestException)
        {
            throw new InvalidOperationException(
                "Telegram serveri ilə bağlantı qurulmadı.");
        }

        using (response)
        {
            var responseBody =
                await response.Content.ReadAsStringAsync(
                    cancellationToken);

            TelegramApiResponse? telegramResponse;

            try
            {
                telegramResponse =
                    JsonSerializer.Deserialize<
                        TelegramApiResponse>(
                        responseBody,
                        JsonOptions);
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
                    $"Telegram göndərişi uğursuz oldu: " +
                    description);
            }
        }
    }

    private TelegramChannelSettings
        GetValidatedChannelSettings(
            TelegramChannel channel)
    {
        if (!_settings.Enabled)
        {
            throw new InvalidOperationException(
                "Telegram bildirişləri aktiv deyil.");
        }

        var channelSettings = channel switch
        {
            TelegramChannel.Orders =>
                _settings.Orders,

            TelegramChannel.Returns =>
                _settings.Returns,

            TelegramChannel.Delivery =>
                _settings.Delivery,

            TelegramChannel.Attendance =>
                _settings.Attendance,

            _ => throw new ArgumentOutOfRangeException(
                nameof(channel),
                channel,
                "Düzgün Telegram kanalı seçilməyib.")
        };

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

        return channelSettings;
    }

    private static TelegramPhotoContent NormalizePhoto(
        TelegramPhotoContent photo)
    {
        ArgumentNullException.ThrowIfNull(photo);

        if (photo.Content.Length == 0)
        {
            throw new ArgumentException(
                "Telegram şəkil faylı boş ola bilməz.");
        }

        if (string.IsNullOrWhiteSpace(photo.FileName))
        {
            throw new ArgumentException(
                "Telegram şəkil adı boş ola bilməz.");
        }

        if (string.IsNullOrWhiteSpace(photo.ContentType))
        {
            throw new ArgumentException(
                "Telegram şəkil tipi boş ola bilməz.");
        }

        if (!MediaTypeHeaderValue.TryParse(
                photo.ContentType,
                out _))
        {
            throw new ArgumentException(
                "Telegram şəkil tipi düzgün deyil.");
        }

        return new TelegramPhotoContent
        {
            Content = photo.Content,
            FileName = Path.GetFileName(
                photo.FileName.Trim()),

            ContentType = photo.ContentType.Trim()
        };
    }

    private static ByteArrayContent CreateFileContent(
        TelegramPhotoContent photo)
    {
        var fileContent =
            new ByteArrayContent(photo.Content);

        fileContent.Headers.ContentType =
            MediaTypeHeaderValue.Parse(
                photo.ContentType);

        return fileContent;
    }

    private static Uri CreateRequestUri(
        string botToken,
        string methodName)
    {
        return new Uri(
            $"./bot{botToken}/{methodName}",
            UriKind.Relative);
    }

    private sealed class TelegramApiResponse
    {
        public bool Ok { get; init; }

        public string? Description { get; init; }
    }
}