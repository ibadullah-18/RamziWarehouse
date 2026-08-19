using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RamziWarehouse.Api.Authorization;
using RamziWarehouse.Application.Abstractions.Identity;
using RamziWarehouse.Application.Abstractions.Users;
using RamziWarehouse.Application.Features.Users.Dtos;

namespace RamziWarehouse.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public sealed class UsersController : ControllerBase
{
    private readonly ICurrentUserService
        _currentUserService;

    private readonly IUserService
        _userService;

    public UsersController(
        ICurrentUserService currentUserService,
        IUserService userService)
    {
        _currentUserService =
            currentUserService;

        _userService =
            userService;
    }

    [HttpGet("me")]
    public ActionResult<CurrentUserDto>
        GetCurrentUser()
    {
        return Ok(new CurrentUserDto
        {
            Id = _currentUserService.UserId,
            FullName =
                _currentUserService.FullName,
            Username =
                _currentUserService.Username,
            Role =
                _currentUserService.Role
        });
    }

    [HttpGet]
    public async Task<
        ActionResult<IReadOnlyList<UserDto>>>
        GetAll(
            [FromQuery] string? search,
            CancellationToken cancellationToken)
    {
        var response =
            await _userService.GetAllAsync(
                search,
                cancellationToken);

        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserDto>>
        GetById(
            Guid id,
            CancellationToken cancellationToken)
    {
        var response =
            await _userService.GetByIdAsync(
                id,
                cancellationToken);

        return Ok(response);
    }

    [HttpPost]
    [Authorize(
        Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<UserDto>>
        Create(
            [FromBody]
            CreateUserRequestDto request,
            CancellationToken cancellationToken)
    {
        var response =
            await _userService.CreateAsync(
                request,
                cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new
            {
                id = response.Id
            },
            response);
    }

    [HttpPut("{id:guid}")]
    [Authorize(
        Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<UserDto>>
        Update(
            Guid id,
            [FromBody]
            UpdateUserRequestDto request,
            CancellationToken cancellationToken)
    {
        var response =
            await _userService.UpdateAsync(
                id,
                request,
                cancellationToken);

        return Ok(response);
    }

    [HttpPut("{id:guid}/password")]
    [Authorize(
        Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult>
        ChangePassword(
            Guid id,
            [FromBody]
            ChangeUserPasswordRequestDto request,
            CancellationToken cancellationToken)
    {
        await _userService.ChangePasswordAsync(
            id,
            request,
            cancellationToken);

        return NoContent();
    }
}