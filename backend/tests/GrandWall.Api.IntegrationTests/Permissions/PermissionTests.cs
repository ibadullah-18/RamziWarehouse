using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using GrandWall.Api.IntegrationTests.Infrastructure;
using GrandWall.Domain.Enums;

namespace GrandWall.Api.IntegrationTests.Permissions;

/// <summary>The admin ticks what each user may do; the change applies at once.</summary>
public sealed class PermissionTests
{
    private const string Password = "Test12345";

    private static async Task<HttpClient> Login(GrandWallApiFactory factory, string username, string password)
    {
        var client = factory.CreateClient();
        IntegrationTestAuthHelper.SetBearerToken(client, await IntegrationTestAuthHelper.LoginAsync(client, username, password));
        return client;
    }

    private static async Task<Guid> CreateUser(HttpClient admin, string username, UserRole role, string[]? permissions)
    {
        var response = await admin.PostAsJsonAsync("/api/users", new { fullName = "Test " + username, username, password = Password, role, permissions });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    [Fact]
    public async Task TickedPermissionsDecideAccessAndChangesApplyImmediately()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await Login(factory, GrandWallApiFactory.AdminUsername, GrandWallApiFactory.AdminPassword);
        var id = await CreateUser(admin, "driver.one", UserRole.Driver, [Permission.ReturnsCreate]);
        using var driver = await Login(factory, "driver.one", Password);

        Assert.Equal(HttpStatusCode.Forbidden, (await driver.GetAsync("/api/customer-accounts/day?date=2026-10-27")).StatusCode);
        var me = await driver.GetFromJsonAsync<JsonElement>("/api/users/me");
        Assert.Equal([Permission.ReturnsCreate], me.GetProperty("permissions").EnumerateArray().Select(p => p.GetString()));

        (await admin.PutAsJsonAsync($"/api/users/{id}", new { fullName = "Test driver", username = "driver.one", role = UserRole.Driver, isActive = true,
            permissions = new[] { Permission.ReturnsCreate, Permission.AccountsUse, Permission.CustomersEdit } })).EnsureSuccessStatusCode();

        // Same access token: permissions are read from the database on every request.
        Assert.Equal(HttpStatusCode.OK, (await driver.GetAsync("/api/customer-accounts/day?date=2026-10-27")).StatusCode);
        var user = await admin.GetFromJsonAsync<JsonElement>($"/api/users/{id}");
        Assert.True(user.GetProperty("hasCustomPermissions").GetBoolean());
    }

    [Fact]
    public async Task RoleDefaultsKeepTheOldBehaviour()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await Login(factory, GrandWallApiFactory.AdminUsername, GrandWallApiFactory.AdminPassword);
        var id = await CreateUser(admin, "acc.one", UserRole.Accountant, null);
        var user = await admin.GetFromJsonAsync<JsonElement>($"/api/users/{id}");
        Assert.False(user.GetProperty("hasCustomPermissions").GetBoolean());
        Assert.Equal(Permission.Defaults(UserRole.Accountant), user.GetProperty("permissions").EnumerateArray().Select(p => p.GetString()!).ToList());
        using var accountant = await Login(factory, "acc.one", Password);
        Assert.Equal(HttpStatusCode.OK, (await accountant.GetAsync("/api/customer-accounts/day?date=2026-10-27")).StatusCode);
    }

    [Fact]
    public async Task UserManagerWhoIsNotAdminCannotCreateAdminsButResetsPasswordsWithoutTheOldOne()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await Login(factory, GrandWallApiFactory.AdminUsername, GrandWallApiFactory.AdminPassword);
        await CreateUser(admin, "hr.one", UserRole.Manager, [Permission.UsersManage]);
        var workerId = await CreateUser(admin, "worker.one", UserRole.WarehouseWorker, null);
        using var hr = await Login(factory, "hr.one", Password);

        var makeAdmin = await hr.PostAsJsonAsync("/api/users", new { fullName = "Bad", username = "bad.admin", password = Password, role = UserRole.Admin });
        Assert.Equal(HttpStatusCode.Forbidden, makeAdmin.StatusCode);

        (await hr.PutAsJsonAsync($"/api/users/{workerId}/password", new { newPassword = "NewPass123" })).EnsureSuccessStatusCode();
        using var worker = await Login(factory, "worker.one", "NewPass123");

        // A full admin can be created by an admin.
        await CreateUser(admin, "second.admin", UserRole.Admin, null);
        using var second = await Login(factory, "second.admin", Password);
        Assert.Equal(HttpStatusCode.OK, (await second.GetAsync("/api/customer-accounts/day?date=2026-10-27")).StatusCode);
    }

    [Fact]
    public async Task BrandingIsPublicAndOnlySettingsPermissionChangesIt()
    {
        using var factory = new GrandWallApiFactory();
        var anonymous = factory.CreateClient();
        var initial = await anonymous.GetFromJsonAsync<JsonElement>("/api/branding");
        Assert.Equal("Ramzi", initial.GetProperty("appName").GetString());

        using var manager = await Login(factory, GrandWallApiFactory.ManagerUsername, GrandWallApiFactory.ManagerPassword);
        Assert.Equal(HttpStatusCode.Forbidden, (await manager.PutAsJsonAsync("/api/branding/name", new { appName = "X" })).StatusCode);

        using var admin = await Login(factory, GrandWallApiFactory.AdminUsername, GrandWallApiFactory.AdminPassword);
        (await admin.PutAsJsonAsync("/api/branding/name", new { appName = "Ramzi Anbar" })).EnsureSuccessStatusCode();
        var png = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0 };
        using var form = new MultipartFormDataContent { { new ByteArrayContent(png), "file", "logo.png" } };
        (await admin.PutAsync("/api/branding/logo", form)).EnsureSuccessStatusCode();

        var updated = await anonymous.GetFromJsonAsync<JsonElement>("/api/branding");
        Assert.Equal("Ramzi Anbar", updated.GetProperty("appName").GetString());
        var logo = await anonymous.GetAsync(updated.GetProperty("logoUrl").GetString());
        Assert.Equal("image/png", logo.Content.Headers.ContentType?.MediaType);

        using var text = new MultipartFormDataContent { { new StringContent("not an image"), "file", "logo.png" } };
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PutAsync("/api/branding/logo", text)).StatusCode);
    }
}
