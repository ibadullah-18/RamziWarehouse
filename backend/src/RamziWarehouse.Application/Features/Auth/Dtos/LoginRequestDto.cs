namespace RamziWarehouse.Application.Features.Auth.Dtos;

public sealed class LoginRequestDto
{
    public string Username { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;
}