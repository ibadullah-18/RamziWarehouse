using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RamziWarehouse.Application.Abstractions.Identity;
using RamziWarehouse.Application.Abstractions.Users;
using RamziWarehouse.Application.Common.Exceptions;
using RamziWarehouse.Application.Features.Users.Dtos;
using RamziWarehouse.Domain.Entities;
using RamziWarehouse.Domain.Enums;
using RamziWarehouse.Infrastructure.Persistence;

namespace RamziWarehouse.Infrastructure.Services;

public sealed class UserService : IUserService
{
    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ICurrentUserService _currentUserService;
    private readonly TimeProvider _timeProvider;

    public UserService(
        AppDbContext dbContext,
        IPasswordHasher<User> passwordHasher,
        ICurrentUserService currentUserService,
        TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _currentUserService = currentUserService;
        _timeProvider = timeProvider;
    }

    public async Task<IReadOnlyList<UserDto>> GetAllAsync(
        string? search,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Users
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchText = search.Trim();

            query = query.Where(user =>
                user.FullName.Contains(searchText) ||
                user.Username.Contains(searchText));
        }

        return await query
            .OrderBy(user => user.FullName)
            .Select(user => new UserDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Username = user.Username,
                Role = user.Role,
                IsActive = user.IsActive,
                LastLoginAtUtc = user.LastLoginAtUtc,
                CreatedAtUtc = user.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<UserDto> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(
                currentUser => currentUser.Id == id,
                cancellationToken);

        if (user is null)
        {
            throw new NotFoundException(
                "İstifadəçi tapılmadı.");
        }

        return MapToDto(user);
    }

    public async Task<UserDto> CreateAsync(
        CreateUserRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var username = request.Username
            .Trim()
            .ToLowerInvariant();

        var usernameExists = await _dbContext.Users
            .AnyAsync(
                user => user.Username == username,
                cancellationToken);

        if (usernameExists)
        {
            throw new ConflictException(
                "Bu istifadəçi adı artıq mövcuddur.");
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Username = username,
            Role = request.Role,
            IsActive = true
        };

        user.PasswordHash = _passwordHasher.HashPassword(
            user,
            request.Password);

        _dbContext.Users.Add(user);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(user);
    }

    public async Task<UserDto> UpdateAsync(
        Guid id,
        UpdateUserRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users
            .SingleOrDefaultAsync(
                currentUser => currentUser.Id == id,
                cancellationToken);

        if (user is null)
        {
            throw new NotFoundException(
                "İstifadəçi tapılmadı.");
        }

        var username = request.Username
            .Trim()
            .ToLowerInvariant();

        var usernameExists = await _dbContext.Users
            .AnyAsync(
                currentUser =>
                    currentUser.Id != id &&
                    currentUser.Username == username,
                cancellationToken);

        if (usernameExists)
        {
            throw new ConflictException(
                "Bu istifadəçi adı artıq mövcuddur.");
        }

        var newIsActive = request.IsActive!.Value;

        if (id == _currentUserService.UserId && !newIsActive)
        {
            throw new ConflictException(
                "Hazırda daxil olduğunuz hesabı deaktiv edə bilməzsiniz.");
        }

        var removesActiveManager =
            user.Role == UserRole.Manager &&
            user.IsActive &&
            (request.Role != UserRole.Manager || !newIsActive);

        if (removesActiveManager)
        {
            var anotherManagerExists = await _dbContext.Users
                .AnyAsync(
                    currentUser =>
                        currentUser.Id != id &&
                        currentUser.Role == UserRole.Manager &&
                        currentUser.IsActive,
                    cancellationToken);

            if (!anotherManagerExists)
            {
                throw new ConflictException(
                    "Sistemdə ən az bir aktiv menecer qalmalıdır.");
            }
        }

        var wasActive = user.IsActive;

        user.FullName = request.FullName.Trim();
        user.Username = username;
        user.Role = request.Role;
        user.IsActive = newIsActive;

        if (wasActive && !newIsActive)
        {
            await RevokeActiveTokensAsync(
                user.Id,
                cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(user);
    }

    public async Task ChangePasswordAsync(
        Guid id,
        ChangeUserPasswordRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users
            .SingleOrDefaultAsync(
                currentUser => currentUser.Id == id,
                cancellationToken);

        if (user is null)
        {
            throw new NotFoundException(
                "İstifadəçi tapılmadı.");
        }

        user.PasswordHash = _passwordHasher.HashPassword(
            user,
            request.NewPassword);

        await RevokeActiveTokensAsync(
            user.Id,
            cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task RevokeActiveTokensAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;

        var activeTokens = await _dbContext.RefreshTokens
            .Where(token =>
                token.UserId == userId &&
                !token.RevokedAtUtc.HasValue)
            .ToListAsync(cancellationToken);

        foreach (var token in activeTokens)
        {
            token.RevokedAtUtc = utcNow;
        }
    }

    private static UserDto MapToDto(User user)
    {
        return new UserDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Username = user.Username,
            Role = user.Role,
            IsActive = user.IsActive,
            LastLoginAtUtc = user.LastLoginAtUtc,
            CreatedAtUtc = user.CreatedAtUtc
        };
    }
}