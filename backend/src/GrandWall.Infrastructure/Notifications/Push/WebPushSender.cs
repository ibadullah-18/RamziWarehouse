using System.Net;
using System.Text.Json;
using GrandWall.Domain.Entities;
using Microsoft.Extensions.Configuration;
using WebPush;

namespace GrandWall.Infrastructure.Notifications.Push;

public enum WebPushResult
{
    Sent,
    /// <summary>The browser dropped the subscription (uninstalled, permission removed).</summary>
    Gone,
    /// <summary>Temporary problem; try again later.</summary>
    Retry,
    /// <summary>Server keys are missing or wrong; retrying will not help.</summary>
    NotConfigured
}

public interface IWebPushSender
{
    /// <summary>The VAPID public key browsers subscribe with, or null when web push is off.</summary>
    string? PublicKey { get; }

    Task<WebPushResult> SendAsync(WebPushSubscription subscription, object payload, CancellationToken ct);
}

/// <summary>
/// Sends standard Web Push (VAPID) messages. Keys are configured as WebPush:PublicKey,
/// WebPush:PrivateKey and WebPush:Subject (mailto: or https: contact).
/// </summary>
public sealed class WebPushSender(IConfiguration configuration) : IWebPushSender
{
    private readonly string? publicKey = Clean(configuration["WebPush:PublicKey"]);
    private readonly string? privateKey = Clean(configuration["WebPush:PrivateKey"]);
    private readonly string subject = Clean(configuration["WebPush:Subject"]) ?? "mailto:admin@grandwall.az";

    public string? PublicKey => publicKey is not null && privateKey is not null ? publicKey : null;

    public async Task<WebPushResult> SendAsync(WebPushSubscription subscription, object payload, CancellationToken ct)
    {
        if (PublicKey is null) return WebPushResult.NotConfigured;
        var client = new WebPushClient();
        try
        {
            await client.SendNotificationAsync(
                new PushSubscription(subscription.Endpoint, subscription.P256dh, subscription.Auth),
                JsonSerializer.Serialize(payload, new JsonSerializerOptions(JsonSerializerDefaults.Web)),
                new Dictionary<string, object>
                {
                    ["vapidDetails"] = new VapidDetails(subject, publicKey, privateKey),
                    ["TTL"] = 24 * 3600
                },
                ct);
            return WebPushResult.Sent;
        }
        catch (WebPushException exception) when (exception.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone)
        {
            return WebPushResult.Gone;
        }
        catch (WebPushException exception) when (exception.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden or HttpStatusCode.BadRequest)
        {
            return WebPushResult.NotConfigured;
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            return WebPushResult.Retry;
        }
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
