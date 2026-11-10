using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
namespace GrandWall.Infrastructure.Notifications.Push;
public sealed class PushDeliveryProcessor(AppDbContext db,HttpClient http,IConfiguration configuration,TimeProvider clock,ILogger<PushDeliveryProcessor> logger,IWebPushSender? webPush=null)
{
    public async Task ProcessAsync(CancellationToken ct)
    {
        var now=clock.GetUtcNow().UtcDateTime;
        var pending=await db.PushDeliveries.Where(p=>!p.Completed && p.NextAttemptUtc<=now).OrderBy(p=>p.NextAttemptUtc).Take(50).ToListAsync(ct);
        foreach(var p in pending)
        {
            if(p.Token.StartsWith(PushNotificationQueue.WebTokenPrefix,StringComparison.Ordinal)) {await DeliverWebAsync(p,now,ct);continue;}
            if(p.ExpiresAtUtc<=now || !await db.PushDevices.AnyAsync(d=>d.Token==p.Token && d.UserId==p.UserId,ct)
                || !await CanReceiveAsync(p.UserId,ct)
                || !await db.ProductReturns.AnyAsync(r=>r.Id==p.ProductReturnId && !r.IsDeleted && r.Status==ReturnStatus.Submitted,ct)) {p.Completed=true;continue;}
            try
            {
                var receipt=p.TicketId!=null;
                using var request=new HttpRequestMessage(HttpMethod.Post,receipt?"getReceipts":"send");
                var accessToken=configuration["Push:AccessToken"];
                if(!string.IsNullOrWhiteSpace(accessToken)) request.Headers.Authorization=new AuthenticationHeaderValue("Bearer",accessToken);
                request.Content=receipt?JsonContent.Create(new{ids=new[]{p.TicketId}}):JsonContent.Create(new{to=p.Token,title="Yeni vazvrad / vitrin",body=p.Body,sound="default",channelId="returns",data=new{returnId=p.ProductReturnId,userId=p.UserId}});
                using var response=await http.SendAsync(request,ct);response.EnsureSuccessStatusCode();
                using var json=JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
                if(!json.RootElement.TryGetProperty("data",out var data)) throw new InvalidOperationException("Push response has no data.");
                JsonElement result;
                if(receipt){if(!data.TryGetProperty(p.TicketId!,out result)){p.NextAttemptUtc=now.AddMinutes(15);continue;}}
                else result=data.ValueKind==JsonValueKind.Array?data[0]:data;
                var status=result.GetProperty("status").GetString();
                if(status=="ok")
                {
                    if(receipt)p.Completed=true;
                    else {p.TicketId=result.GetProperty("id").GetString();p.NextAttemptUtc=now.AddMinutes(15);}
                }
                else
                {
                    var error=result.TryGetProperty("details",out var details)&&details.TryGetProperty("error",out var code)?code.GetString():"Unknown";
                    if(error=="DeviceNotRegistered")
                    {
                        var device=await db.PushDevices.FirstOrDefaultAsync(d=>d.Token==p.Token && d.UserId==p.UserId,ct);
                        if(device!=null)db.PushDevices.Remove(device);p.Completed=true;
                    }
                    else if(error is "InvalidCredentials" or "MessageTooBig") {p.Completed=true;logger.LogWarning("Push delivery configuration failure: {Error}",error);}
                    else Retry(p,now);
                }
            }
            catch(OperationCanceledException) when(ct.IsCancellationRequested){throw;}
            catch(Exception ex){logger.LogWarning("Push delivery retry: {Type}",ex.GetType().Name);Retry(p,now);}
        }
        await db.SaveChangesAsync(ct);
    }
    /// <summary>Browser (installed web app) delivery: one encrypted Web Push message, no receipts.</summary>
    private async Task DeliverWebAsync(PushDelivery p,DateTime now,CancellationToken ct)
    {
        var id=Guid.TryParseExact(p.Token[PushNotificationQueue.WebTokenPrefix.Length..],"N",out var parsed)?parsed:Guid.Empty;
        var subscription=await db.WebPushSubscriptions.FirstOrDefaultAsync(s=>s.Id==id && s.UserId==p.UserId,ct);
        if(webPush is null || subscription is null || p.ExpiresAtUtc<=now
            || !await CanReceiveAsync(p.UserId,ct)
            || !await db.ProductReturns.AnyAsync(r=>r.Id==p.ProductReturnId && !r.IsDeleted && r.Status==ReturnStatus.Submitted,ct)) {p.Completed=true;return;}
        var result=await webPush.SendAsync(subscription,new{title="Yeni vazvrad / vitrin",body=p.Body,url="/return-detail/"+p.ProductReturnId,tag="return-"+p.ProductReturnId},ct);
        switch(result)
        {
            case WebPushResult.Sent: p.Completed=true; break;
            case WebPushResult.Gone: db.WebPushSubscriptions.Remove(subscription); p.Completed=true; break;
            case WebPushResult.NotConfigured: p.Completed=true; logger.LogWarning("Web push is not configured or the keys were rejected."); break;
            default: Retry(p,now); break;
        }
    }
    private async Task<bool> CanReceiveAsync(Guid userId,CancellationToken ct)
    {
        var u=await db.Users.AsNoTracking().FirstOrDefaultAsync(x=>x.Id==userId && x.IsActive && !x.IsDeleted,ct);
        return u is not null && Permission.Effective(u).Contains(Permission.ReturnsNotify);
    }
    private static void Retry(PushDelivery p,DateTime now){p.Attempts++;p.NextAttemptUtc=now.AddSeconds(Math.Min(1800,30*Math.Pow(2,p.Attempts)));if(p.Attempts>=8)p.Completed=true;}
}
