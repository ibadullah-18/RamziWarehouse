namespace RamziWarehouse.Application.Features.Users.Dtos;

public sealed class ChangeUserPasswordRequestDto
{
    public string NewPassword { get; init; } = string.Empty;
}