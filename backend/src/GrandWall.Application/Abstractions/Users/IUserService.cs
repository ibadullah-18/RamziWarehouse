using GrandWall.Application.Features.Users.Dtos;

namespace GrandWall.Application.Abstractions.Users;

public interface IUserService
{
    Task<IReadOnlyList<UserDto>> GetAllAsync(
        string? search,
        CancellationToken cancellationToken = default);

    Task<UserDto> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<UserDto> CreateAsync(
        CreateUserRequestDto request,
        CancellationToken cancellationToken = default);

    Task<UserDto> UpdateAsync(
        Guid id,
        UpdateUserRequestDto request,
        CancellationToken cancellationToken = default);

    Task ChangePasswordAsync(
        Guid id,
        ChangeUserPasswordRequestDto request,
        CancellationToken cancellationToken = default);
}