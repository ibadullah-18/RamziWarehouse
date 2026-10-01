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
public sealed class PushDeliveryProcessor(AppDbContext db,HttpClient http,IConfiguration configuration,TimeProvider clock,ILogger<PushDeliveryProcessor> logger)
{
    public async Task ProcessAsync(CancellationToken ct)
    {
        var now=clock.GetUtcNow().UtcDateTime;
        var pending=await db.PushDeliveries.Where(p=>!p.Completed && p.NextAttemptUtc<=now).OrderBy(p=>p.NextAttemptUtc).Take(50).ToListAsync(ct);
        foreach(var p in pending)
        {
            if(p.ExpiresAtUtc<=now || !await db.PushDevices.AnyAsync(d=>d.Token==p.Token && d.UserId==p.UserId,ct)
                || !await db.Users.AnyAsync(u=>u.Id==p.UserId && u.Role==UserRole.Manager && u.IsActive && !u.IsDeleted,ct)
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
    private static void Retry(PushDelivery p,DateTime now){p.Attempts++;p.NextAttemptUtc=now.AddSeconds(Math.Min(1800,30*Math.Pow(2,p.Attempts)));if(p.Attempts>=8)p.Completed=true;}
}
