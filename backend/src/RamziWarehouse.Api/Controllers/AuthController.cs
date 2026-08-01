using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RamziWarehouse.Application.Abstractions.Authentication;
using RamziWarehouse.Application.Features.Auth.Dtos;

namespace RamziWarehouse.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(
        [FromBody] LoginRequestDto request,
        CancellationToken cancellationToken)
    {
        var response = await _authService.LoginAsync(
            request,
            cancellationToken);

        return Ok(response);
    }

    [AllowAnonymous]
    [HttpPost("refresh-token")]
    public async Task<ActionResult<AuthResponseDto>> RefreshToken(
        [FromBody] RefreshTokenRequestDto request,
        CancellationToken cancellationToken)
    {
        var response = await _authService.RefreshTokenAsync(
            request,
            cancellationToken);

        return Ok(response);
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(
        [FromBody] RefreshTokenRequestDto request,
        CancellationToken cancellationToken)
    {
        await _authService.LogoutAsync(
            request,
            cancellationToken);

        return NoContent();
    }
}