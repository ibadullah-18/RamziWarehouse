using GrandWall.Application.Common.Exceptions;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
namespace GrandWall.Infrastructure.Notifications.Push;
public sealed class PushNotificationQueue(AppDbContext db, TimeProvider clock)
{
    public async Task RegisterAsync(Guid userId,string token,CancellationToken ct)
    {
        if(token.Length>200 || !Regex.IsMatch(token,@"^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$")) throw new ConflictException("Bildiriş tokeni düzgün deyil.");
        var device=await db.PushDevices.FindAsync([token],ct);
        if(device==null){device=new PushDevice{Token=token};db.PushDevices.Add(device);}
        device.UserId=userId;device.RegisteredAtUtc=clock.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(ct);
    }
    public async Task UnregisterAsync(Guid userId,string token,CancellationToken ct)
    {
        var device=await db.PushDevices.FirstOrDefaultAsync(d=>d.Token==token && d.UserId==userId,ct);
        if(device!=null){db.PushDevices.Remove(device);await db.SaveChangesAsync(ct);}
    }
    /// <summary>Token of a web push delivery: "web:" + subscription id (the endpoint itself is too long).</summary>
    public const string WebTokenPrefix = "web:";

    public async Task RegisterWebAsync(Guid userId, string endpoint, string p256dh, string auth, CancellationToken ct)
    {
        if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps || endpoint.Length > 800
            || string.IsNullOrWhiteSpace(p256dh) || p256dh.Length > 200 || string.IsNullOrWhiteSpace(auth) || auth.Length > 100)
            throw new ConflictException("Brauzer bildiriş abunəliyi düzgün deyil.");
        var subscription = await db.WebPushSubscriptions.FirstOrDefaultAsync(s => s.Endpoint == endpoint, ct);
        if (subscription is null)
        {
            subscription = new WebPushSubscription { Endpoint = endpoint };
            db.WebPushSubscriptions.Add(subscription);
        }
        subscription.UserId = userId;
        subscription.P256dh = p256dh;
        subscription.Auth = auth;
        subscription.RegisteredAtUtc = clock.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(ct);
    }

    public async Task UnregisterWebAsync(Guid userId, string endpoint, CancellationToken ct)
    {
        var subscription = await db.WebPushSubscriptions.FirstOrDefaultAsync(s => s.Endpoint == endpoint && s.UserId == userId, ct);
        if (subscription is not null)
        {
            db.WebPushSubscriptions.Remove(subscription);
            await db.SaveChangesAsync(ct);
        }
    }

    /// <summary>Active users who receive new-return notifications ("returns.notify").</summary>
    public async Task<HashSet<Guid>> NotifiedUserIdsAsync(CancellationToken ct)
    {
        var users = await db.Users.AsNoTracking().Where(u => u.IsActive && !u.IsDeleted)
            .Select(u => new { u.Id, u.Role, u.Permissions }).ToListAsync(ct);
        return users.Where(u => Permission.Effective(u.Role, u.Permissions).Contains(Permission.ReturnsNotify)).Select(u => u.Id).ToHashSet();
    }

    public async Task EnqueueReturnAsync(ProductReturn record,CancellationToken ct)
    {
        var notified=await NotifiedUserIdsAsync(ct);
        var tokens=(await db.PushDevices.ToListAsync(ct)).Where(d=>notified.Contains(d.UserId)).ToList();
        var now=clock.GetUtcNow().UtcDateTime;
        foreach(var device in tokens) db.PushDeliveries.Add(new PushDelivery{ProductReturnId=record.Id,UserId=device.UserId,Token=device.Token,
            Body=$"{record.Customer.Name} · {record.Items.Count} məhsul · Təsdiq gözləyir",NextAttemptUtc=now,ExpiresAtUtc=now.AddDays(1)});
        var webSubscriptions = (await db.WebPushSubscriptions.ToListAsync(ct)).Where(w => notified.Contains(w.UserId)).ToList();
        foreach (var subscription in webSubscriptions) db.PushDeliveries.Add(new PushDelivery{ProductReturnId=record.Id,UserId=subscription.UserId,Token=WebTokenPrefix+subscription.Id.ToString("N"),
            Body=$"{record.Customer.Name} · {record.Items.Count} məhsul · Yeni vazvrad / vitrin",NextAttemptUtc=now,ExpiresAtUtc=now.AddDays(1)});
        // Saved by the submission together with the status change, never by a separate transaction.
    }
}
