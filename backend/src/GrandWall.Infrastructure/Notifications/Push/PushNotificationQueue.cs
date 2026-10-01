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
    public async Task EnqueueReturnAsync(ProductReturn record,CancellationToken ct)
    {
        var tokens=await db.PushDevices.Where(d=>db.Users.Any(u=>u.Id==d.UserId && u.Role==UserRole.Manager && u.IsActive && !u.IsDeleted)).ToListAsync(ct);
        var now=clock.GetUtcNow().UtcDateTime;
        foreach(var device in tokens) db.PushDeliveries.Add(new PushDelivery{ProductReturnId=record.Id,UserId=device.UserId,Token=device.Token,
            Body=$"{record.Customer.Name} · {record.Items.Count} məhsul · Təsdiq gözləyir",NextAttemptUtc=now,ExpiresAtUtc=now.AddDays(1)});
        // Saved by the submission together with the status change, never by a separate transaction.
    }
}
