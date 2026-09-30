using GrandWall.Domain.Entities;
using GrandWall.Infrastructure.Security;
using Microsoft.Extensions.Options;

namespace GrandWall.Api.IntegrationTests.Authentication;

public sealed class PersistentTokenTests
{
    private sealed class Clock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2026, 10, 1, 10, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }
    [Fact]
    public void PersistentLoginKeepsAccessShortAndRenewsTheLongSession()
    {
        var clock = new Clock();
        var service = new TokenService(Options.Create(new JwtSettings
        {
            Issuer = "test", Audience = "test", Key = "Test-only-signing-key-with-more-than-32-characters"
        }), clock);
        var user = new User { Username = "driver", FullName = "Driver" };
        var first = service.CreateTokens(user);
        Assert.Equal(clock.Now.UtcDateTime.AddMinutes(15), first.AccessTokenExpiresAtUtc);
        Assert.Equal(clock.Now.UtcDateTime.AddDays(3650), first.RefreshTokenExpiresAtUtc);
        clock.Now = clock.Now.AddDays(1);
        var renewed = service.CreateTokens(user);
        Assert.Equal(clock.Now.UtcDateTime.AddDays(3650), renewed.RefreshTokenExpiresAtUtc);
        Assert.NotEqual(first.RefreshToken, renewed.RefreshToken);
        Assert.Equal(service.HashRefreshToken(renewed.RefreshToken), renewed.RefreshTokenHash);
    }
}
