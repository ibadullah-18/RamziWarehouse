using GrandWall.Domain.Entities;

namespace GrandWall.Application.Abstractions.Authentication;

public interface ITokenService
{
    TokenResult CreateTokens(User user);

    string HashRefreshToken(string refreshToken);
}