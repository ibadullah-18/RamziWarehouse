using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using GrandWall.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using GrandWall.Api.Authorization;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Security;

namespace GrandWall.Api.Extensions;

public static class AuthenticationExtensions
{
    public static IServiceCollection AddJwtAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var jwtSection = configuration.GetSection(
            JwtSettings.SectionName);

        var issuer = jwtSection["Issuer"];
        var audience = jwtSection["Audience"];
        var key = jwtSection["Key"];

        if (string.IsNullOrWhiteSpace(issuer) ||
            string.IsNullOrWhiteSpace(audience) ||
            string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException(
                "JWT settings are not configured correctly.");
        }

        if (Encoding.UTF8.GetByteCount(key) < 32)
        {
            throw new InvalidOperationException(
                "JWT key must contain at least 32 bytes.");
        }

        services
            .AddAuthentication(
                JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Events = new JwtBearerEvents { OnTokenValidated = async context => {
                    var idClaim = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                    if(!Guid.TryParse(idClaim,out var id)) { context.Fail("Invalid user."); return; }
                    var db=context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                    var user=await db.Users.AsNoTracking().FirstOrDefaultAsync(u=>u.Id==id,context.HttpContext.RequestAborted);
                    if(user==null || !user.IsActive || user.IsDeleted || context.Principal?.FindFirstValue(ClaimTypes.Role)!=user.Role.ToString()) context.Fail("User account is unavailable.");
                }};
                options.TokenValidationParameters =
                    new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuer = issuer,

                        ValidateAudience = true,
                        ValidAudience = audience,

                        ValidateIssuerSigningKey = true,

                        IssuerSigningKey =
                            new SymmetricSecurityKey(
                                Encoding.UTF8.GetBytes(key)),

                        ValidateLifetime = true,
                        ClockSkew = TimeSpan.Zero,

                        NameClaimType = ClaimTypes.Name,
                        RoleClaimType = ClaimTypes.Role
                    };
            });

        services.AddAuthorization(options =>
        {
            options.AddPolicy(
                AuthorizationPolicies.AdminOnly,
                policy => policy.RequireRole(
                    nameof(UserRole.Admin)));

            options.AddPolicy(
                AuthorizationPolicies.ManagerOrAdmin,
                policy => policy.RequireRole(
                    nameof(UserRole.Manager),
                    nameof(UserRole.Admin)));
        });

        return services;
    }
}