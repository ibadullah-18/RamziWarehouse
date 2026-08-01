using RamziWarehouse.Application.Features.Auth.Dtos;

namespace RamziWarehouse.Application.Abstractions.Authentication;

public interface IAuthService
{
    Task<AuthResponseDto> LoginAsync(
        LoginRequestDto request,
        CancellationToken cancellationToken = default);

    Task<AuthResponseDto> RefreshTokenAsync(
        RefreshTokenRequestDto request,
        CancellationToken cancellationToken = default);

    Task LogoutAsync(
        RefreshTokenRequestDto request,
        CancellationToken cancellationToken = default);
}