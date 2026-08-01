using RamziWarehouse.Domain.Entities;

namespace RamziWarehouse.Application.Abstractions.Authentication;

public interface ITokenService
{
    TokenResult CreateTokens(User user);

    string HashRefreshToken(string refreshToken);
}