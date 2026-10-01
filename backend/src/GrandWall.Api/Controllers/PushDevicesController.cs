using GrandWall.Application.Abstractions.Identity;
using GrandWall.Infrastructure.Notifications.Push;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace GrandWall.Api.Controllers;
[ApiController,Route("api/push-devices"),Authorize(Roles="Manager,Admin")]
public sealed class PushDevicesController(PushNotificationQueue queue,ICurrentUserService user) : ControllerBase
{
    public sealed record TokenRequest(string Token);
    [HttpPost]
    public async Task<IActionResult> Register(TokenRequest request,CancellationToken ct){await queue.RegisterAsync(user.UserId,request.Token??"",ct);return NoContent();}
    [HttpDelete]
    public async Task<IActionResult> Unregister([FromBody] TokenRequest request,CancellationToken ct){await queue.UnregisterAsync(user.UserId,request.Token??"",ct);return NoContent();}
}
