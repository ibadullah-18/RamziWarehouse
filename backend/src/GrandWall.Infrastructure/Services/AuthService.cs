using System.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using GrandWall.Application.Abstractions.Authentication;
using GrandWall.Application.Common.Exceptions;
using GrandWall.Application.Features.Auth.Dtos;
using GrandWall.Domain.Entities;
using GrandWall.Infrastructure.Persistence;

namespace GrandWall.Infrastructure.Services;

public sealed class AuthService : IAuthService
{
    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly TimeProvider _timeProvider;

    public AuthService(
        AppDbContext dbContext,
        IPasswordHasher<User> passwordHasher,
        ITokenService tokenService,
        TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _timeProvider = timeProvider;
    }

    public async Task<AuthResponseDto> LoginAsync(
        LoginRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var username = request.Username.Trim();

        var user = await _dbContext.Users
            .SingleOrDefaultAsync(
                currentUser =>
                    currentUser.Username == username,
                cancellationToken);

        if (user is null || !user.IsActive)
        {
            throw new UnauthorizedException(
                "İstifadəçi adı və ya şifrə yanlışdır.");
        }

        var verificationResult =
            _passwordHasher.VerifyHashedPassword(
                user,
                user.PasswordHash,
                request.Password);

        if (verificationResult ==
            PasswordVerificationResult.Failed)
        {
            throw new UnauthorizedException(
                "İstifadəçi adı və ya şifrə yanlışdır.");
        }

        if (verificationResult ==
            PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash =
                _passwordHasher.HashPassword(
                    user,
                    request.Password);
        }

        var tokenResult =
            _tokenService.CreateTokens(user);

        var utcNow =
            _timeProvider
                .GetUtcNow()
                .UtcDateTime;

        user.LastLoginAtUtc = utcNow;

        _dbContext.RefreshTokens.Add(
            new RefreshToken
            {
                UserId = user.Id,
                TokenHash =
                    tokenResult.RefreshTokenHash,
                ExpiresAtUtc =
                    tokenResult
                        .RefreshTokenExpiresAtUtc
            });

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return CreateResponse(
            user,
            tokenResult);
    }

    public async Task<AuthResponseDto> RefreshTokenAsync(
        RefreshTokenRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var tokenHash =
            _tokenService.HashRefreshToken(
                request.RefreshToken);

        var executionStrategy =
            _dbContext.Database
                .CreateExecutionStrategy();

        return await executionStrategy.ExecuteAsync(
            async () =>
            {
                await using var transaction =
                    await _dbContext.Database
                        .BeginTransactionAsync(
                            IsolationLevel.Serializable,
                            cancellationToken);

                var storedToken =
                    await _dbContext.RefreshTokens
                        .Include(token => token.User)
                        .SingleOrDefaultAsync(
                            token =>
                                token.TokenHash ==
                                tokenHash,
                            cancellationToken);

                var utcNow =
                    _timeProvider
                        .GetUtcNow()
                        .UtcDateTime;

                if (storedToken is null ||
                    storedToken.RevokedAtUtc.HasValue ||
                    storedToken.ExpiresAtUtc <= utcNow ||
                    !storedToken.User.IsActive)
                {
                    throw new UnauthorizedException(
                        "Refresh token etibarsızdır və ya vaxtı bitib.");
                }

                var tokenResult =
                    _tokenService.CreateTokens(
                        storedToken.User);

                storedToken.RevokedAtUtc =
                    utcNow;

                storedToken.ReplacedByTokenHash =
                    tokenResult.RefreshTokenHash;

                _dbContext.RefreshTokens.Add(
                    new RefreshToken
                    {
                        UserId =
                            storedToken.UserId,

                        TokenHash =
                            tokenResult
                                .RefreshTokenHash,

                        ExpiresAtUtc =
                            tokenResult
                                .RefreshTokenExpiresAtUtc
                    });

                await _dbContext.SaveChangesAsync(
                    cancellationToken);

                await transaction.CommitAsync(
                    cancellationToken);

                return CreateResponse(
                    storedToken.User,
                    tokenResult);
            });
    }

    public async Task LogoutAsync(
        RefreshTokenRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var tokenHash =
            _tokenService.HashRefreshToken(
                request.RefreshToken);

        var storedToken =
            await _dbContext.RefreshTokens
                .SingleOrDefaultAsync(
                    token =>
                        token.TokenHash ==
                        tokenHash,
                    cancellationToken);

        if (storedToken is null ||
            storedToken.RevokedAtUtc.HasValue)
        {
            return;
        }

        storedToken.RevokedAtUtc =
            _timeProvider
                .GetUtcNow()
                .UtcDateTime;

        await _dbContext.SaveChangesAsync(
            cancellationToken);
    }

    private static AuthResponseDto CreateResponse(
        User user,
        TokenResult tokenResult)
    {
        return new AuthResponseDto
        {
            AccessToken =
                tokenResult.AccessToken,

            RefreshToken =
                tokenResult.RefreshToken,

            AccessTokenExpiresAtUtc =
                tokenResult
                    .AccessTokenExpiresAtUtc,

            UserId = user.Id,
            FullName = user.FullName,
            Username = user.Username,
            Role = user.Role
        };
    }
}