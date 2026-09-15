using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GrandWall.Application.Abstractions.Notifications;
using GrandWall.Application.Features.Telegram.Dtos;

namespace GrandWall.Api.Controllers;

[ApiController]
[Route("api/telegram")]
[Authorize(Roles = "Manager")]
public sealed class TelegramController : ControllerBase
{
    private readonly ITelegramNotificationService
        _telegramNotificationService;

    public TelegramController(
        ITelegramNotificationService
            telegramNotificationService)
    {
        _telegramNotificationService =
            telegramNotificationService;
    }

    [HttpPost("test")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> SendTestMessage(
        [FromBody] SendTelegramTestMessageDto request,
        CancellationToken cancellationToken)
    {
        await _telegramNotificationService.SendTextAsync(
            request.Channel,
            request.Message,
            cancellationToken);

        return NoContent();
    }
}