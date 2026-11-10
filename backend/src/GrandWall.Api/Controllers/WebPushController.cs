using GrandWall.Domain.Enums;
using GrandWall.Api.Authorization;
using GrandWall.Application.Abstractions.Identity;
using GrandWall.Infrastructure.Notifications.Push;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GrandWall.Api.Controllers;

/// <summary>Notifications for the installed web app (iPhone home screen, Android Chrome).</summary>
[ApiController, Route("api/push/web"), Authorize, RequirePermission(Permission.ReturnsNotify)]
public sealed class WebPushController(PushNotificationQueue queue, IWebPushSender sender, ICurrentUserService user) : ControllerBase
{
    public sealed record PublicKeyDto(string? PublicKey);
    public sealed record SubscriptionRequest(string Endpoint, string P256dh, string Auth);
    public sealed record EndpointRequest(string Endpoint);

    /// <summary>The key the browser subscribes with; null when the server has no web push keys.</summary>
    [HttpGet("public-key")]
    public ActionResult<PublicKeyDto> PublicKey() => Ok(new PublicKeyDto(sender.PublicKey));

    [HttpPost("subscriptions")]
    public async Task<IActionResult> Subscribe(SubscriptionRequest request, CancellationToken ct)
    {
        await queue.RegisterWebAsync(user.UserId, request.Endpoint ?? "", request.P256dh ?? "", request.Auth ?? "", ct);
        return NoContent();
    }

    [HttpDelete("subscriptions")]
    public async Task<IActionResult> Unsubscribe([FromBody] EndpointRequest request, CancellationToken ct)
    {
        await queue.UnregisterWebAsync(user.UserId, request.Endpoint ?? "", ct);
        return NoContent();
    }
}
