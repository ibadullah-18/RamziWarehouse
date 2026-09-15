using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using GrandWall.Application.Abstractions.Authentication;
using GrandWall.Domain.Entities;

namespace GrandWall.Infrastructure.Security;

public sealed class TokenService : ITokenService
{
    private readonly JwtSettings _settings;
    private readonly TimeProvider _timeProvider;

    public TokenService(
        IOptions<JwtSettings> settings,
        TimeProvider timeProvider)
    {
        _settings = settings.Value;
        _timeProvider = timeProvider;
    }

    public TokenResult CreateTokens(User user)
    {
        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;

        var accessTokenExpiresAtUtc = utcNow.AddMinutes(
            _settings.AccessTokenMinutes);

        var refreshTokenExpiresAtUtc = utcNow.AddDays(
            _settings.RefreshTokenDays);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.FullName),
            new("username", user.Username),
            new(ClaimTypes.Role, user.Role.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.Username),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var securityKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_settings.Key));

        var credentials = new SigningCredentials(
            securityKey,
            SecurityAlgorithms.HmacSha256);

        var jwtToken = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            notBefore: utcNow,
            expires: accessTokenExpiresAtUtc,
            signingCredentials: credentials);

        var accessToken = new JwtSecurityTokenHandler()
            .WriteToken(jwtToken);

        var refreshToken = Base64UrlEncoder.Encode(
            RandomNumberGenerator.GetBytes(64));

        return new TokenResult
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            RefreshTokenHash = HashRefreshToken(refreshToken),
            AccessTokenExpiresAtUtc = accessTokenExpiresAtUtc,
            RefreshTokenExpiresAtUtc = refreshTokenExpiresAtUtc
        };
    }

    public string HashRefreshToken(string refreshToken)
    {
        var tokenBytes = Encoding.UTF8.GetBytes(refreshToken);
        var hashBytes = SHA256.HashData(tokenBytes);

        return Convert.ToHexString(hashBytes);
    }
}