using System.Security.Claims;
using RamziWarehouse.Application.Abstractions.Identity;
using RamziWarehouse.Application.Common.Exceptions;
using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Api.Services;

public sealed class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(
        IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public bool IsAuthenticated =>
        CurrentPrincipal.Identity?.IsAuthenticated == true;

    public Guid UserId
    {
        get
        {
            var value = GetRequiredClaim(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(value, out var userId))
            {
                throw new UnauthorizedException(
                    "Token daxilində istifadəçi ID-si yanlışdır.");
            }

            return userId;
        }
    }

    public string FullName =>
        GetRequiredClaim(ClaimTypes.Name);

    public string Username =>
        GetRequiredClaim("username");

    public UserRole Role
    {
        get
        {
            var value = GetRequiredClaim(ClaimTypes.Role);

            if (!Enum.TryParse<UserRole>(
                    value,
                    ignoreCase: true,
                    out var role))
            {
                throw new UnauthorizedException(
                    "Token daxilində istifadəçi rolu yanlışdır.");
            }

            return role;
        }
    }

    private ClaimsPrincipal CurrentPrincipal =>
        _httpContextAccessor.HttpContext?.User
        ?? throw new UnauthorizedException(
            "İstifadəçi məlumatı tapılmadı.");

    private string GetRequiredClaim(string claimType)
    {
        var value = CurrentPrincipal
            .FindFirst(claimType)?
            .Value;

        if (string.IsNullOrWhiteSpace(value))
        {
            throw new UnauthorizedException(
                "Token daxilində lazımi məlumat tapılmadı.");
        }

        return value;
    }
}