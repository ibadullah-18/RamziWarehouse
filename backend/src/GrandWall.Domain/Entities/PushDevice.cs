using GrandWall.Domain.Common;
namespace GrandWall.Domain.Entities;
public sealed class PushDevice
{
    public string Token { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public DateTime RegisteredAtUtc { get; set; }
}
public sealed class PushDelivery : BaseEntity
{
    public Guid ProductReturnId { get; set; }
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? TicketId { get; set; }
    public int Attempts { get; set; }
    public DateTime NextAttemptUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public bool Completed { get; set; }
}

/// <summary>
/// A browser that may receive notifications (installed web app on iPhone or Android). The keys
/// come from the browser's push subscription and are needed to encrypt each message.
/// </summary>
public sealed class WebPushSubscription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Endpoint { get; set; } = string.Empty;
    public string P256dh { get; set; } = string.Empty;
    public string Auth { get; set; } = string.Empty;
    public DateTime RegisteredAtUtc { get; set; }
}
