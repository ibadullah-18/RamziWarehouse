using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using GrandWall.Api.IntegrationTests.Infrastructure;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GrandWall.Api.IntegrationTests.Handovers;

/// <summary>"Mal təhvil": driver sends photos + customer + note; the manager sees the day's list.</summary>
public sealed class HandoverTests
{
    private const string Password = "Test12345";

    private static async Task<HttpClient> Login(GrandWallApiFactory factory, string username, string password)
    {
        var client = factory.CreateClient();
        IntegrationTestAuthHelper.SetBearerToken(client, await IntegrationTestAuthHelper.LoginAsync(client, username, password));
        return client;
    }

    private static async Task<HttpClient> Admin(GrandWallApiFactory f) => await Login(f, GrandWallApiFactory.AdminUsername, GrandWallApiFactory.AdminPassword);

    private static async Task<HttpClient> Driver(GrandWallApiFactory f, HttpClient admin, string username)
    {
        (await admin.PostAsJsonAsync("/api/users", new { fullName = "Sürücü " + username, username, password = Password, role = UserRole.Driver })).EnsureSuccessStatusCode();
        return await Login(f, username, Password);
    }

    private static async Task<Guid> Customer(HttpClient admin, string name)
    {
        var response = await admin.PostAsJsonAsync("/api/customers", new { name, phoneNumber = (string?)null, note = (string?)null });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static MultipartFormDataContent Form(Guid operation, Guid customer, string? note, int photos)
    {
        var form = new MultipartFormDataContent
        {
            { new StringContent(operation.ToString()), "operationId" },
            { new StringContent(customer.ToString()), "customerId" },
        };
        if (note is not null) form.Add(new StringContent(note), "note");
        for (var i = 0; i < photos; i++)
        {
            var image = new ByteArrayContent([0xFF, 0xD8, 0xFF, 0xE0, (byte)i, 1, 2, 3]);
            image.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
            form.Add(image, "files", $"photo-{i}.jpg");
        }
        return form;
    }

    [Fact]
    public async Task DriverSendsPhotosAndTheManagerSeesTheDayAndIsNotified()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await Admin(factory);
        using var driver = await Driver(factory, admin, "suruc.bir");
        using var manager = await Login(factory, GrandWallApiFactory.ManagerUsername, GrandWallApiFactory.ManagerPassword);
        var customer = await Customer(admin, "Elvin Market");

        var operation = Guid.NewGuid();
        var created = await driver.PostAsync("/api/handovers", Form(operation, customer, "  Qapıda verildi ", 3));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var handover = await created.Content.ReadFromJsonAsync<JsonElement>();
        var id = handover.GetProperty("id").GetGuid();
        Assert.Equal("Elvin Market", handover.GetProperty("customerName").GetString());
        Assert.Equal("Qapıda verildi", handover.GetProperty("note").GetString());
        Assert.Equal(3, handover.GetProperty("photos").GetArrayLength());

        // Sending again after a lost answer stores nothing new.
        var again = await driver.PostAsync("/api/handovers", Form(operation, customer, "Qapıda verildi", 3));
        Assert.Equal(id, (await again.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid());

        var day = await manager.GetFromJsonAsync<JsonElement>("/api/handovers");
        Assert.True(day.GetProperty("isToday").GetBoolean());
        var item = Assert.Single(day.GetProperty("items").EnumerateArray());
        Assert.False(item.GetProperty("canEdit").GetBoolean());
        var photoId = item.GetProperty("photos")[0].GetProperty("id").GetGuid();
        var photo = await manager.GetAsync($"/api/handovers/{id}/photos/{photoId}/file");
        Assert.Equal(HttpStatusCode.OK, photo.StatusCode);

        // The manager (handovers.notify) gets a notification; the driver who sent it does not.
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.PushDevices.Add(new PushDevice { Token = "ExpoPushToken[m]", UserId = await db.Users.Where(u => u.Role == UserRole.Manager).Select(u => u.Id).FirstAsync() });
        await db.SaveChangesAsync();
        var second = await driver.PostAsync("/api/handovers", Form(Guid.NewGuid(), customer, null, 1));
        second.EnsureSuccessStatusCode();
        var deliveries = await db.PushDeliveries.AsNoTracking().Where(p => p.Kind == PushDelivery.KindHandover).ToListAsync();
        Assert.Single(deliveries);
        Assert.Equal("ExpoPushToken[m]", deliveries[0].Token);
    }

    [Fact]
    public async Task OnlyAllowedUsersSendOrSeeAndTheSenderFixesOrDeletesWithoutAReason()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await Admin(factory);
        using var driver = await Driver(factory, admin, "suruc.iki");
        using var other = await Driver(factory, admin, "suruc.uc");
        using var manager = await Login(factory, GrandWallApiFactory.ManagerUsername, GrandWallApiFactory.ManagerPassword);
        var wrong = await Customer(admin, "Səhv müştəri");
        var right = await Customer(admin, "Düz müştəri");

        // A manager has no "handovers.create" by default; a driver cannot see everyone's list.
        Assert.Equal(HttpStatusCode.Forbidden, (await manager.PostAsync("/api/handovers", Form(Guid.NewGuid(), wrong, null, 1))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await driver.GetAsync("/api/handovers")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await driver.PostAsync("/api/handovers", Form(Guid.NewGuid(), wrong, null, 11))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await driver.PostAsync("/api/handovers", Form(Guid.NewGuid(), wrong, null, 0))).StatusCode);

        var created = await driver.PostAsync("/api/handovers", Form(Guid.NewGuid(), wrong, null, 2));
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var mine = await driver.GetFromJsonAsync<JsonElement>("/api/handovers?mine=true");
        Assert.True(Assert.Single(mine.GetProperty("items").EnumerateArray()).GetProperty("canEdit").GetBoolean());
        Assert.Empty((await other.GetFromJsonAsync<JsonElement>("/api/handovers?mine=true")).GetProperty("items").EnumerateArray());
        Assert.Equal(HttpStatusCode.Forbidden, (await other.GetAsync($"/api/handovers/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await other.DeleteAsync($"/api/handovers/{id}")).StatusCode);

        var fixedOne = await driver.PutAsJsonAsync($"/api/handovers/{id}", new { customerId = right, note = "Düzəldildi" });
        fixedOne.EnsureSuccessStatusCode();
        Assert.Equal("Düz müştəri", (await fixedOne.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("customerName").GetString());

        Assert.Equal(HttpStatusCode.NoContent, (await driver.DeleteAsync($"/api/handovers/{id}")).StatusCode);
        Assert.Empty((await manager.GetFromJsonAsync<JsonElement>("/api/handovers")).GetProperty("items").EnumerateArray());
    }

    [Fact]
    public async Task EachDayIsAnEmptySheetAndOldDaysStayAvailable()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await Admin(factory);
        using var manager = await Login(factory, GrandWallApiFactory.ManagerUsername, GrandWallApiFactory.ManagerPassword);
        var customer = await Customer(admin, "Dünən");

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(4));
            db.Handovers.Add(new Handover
            {
                OperationId = Guid.NewGuid(), CustomerId = customer, CustomerName = "Dünən", BusinessDate = today.AddDays(-1),
                CreatedByUserId = Guid.NewGuid(), CreatedByFullName = "Sürücü", CreatedAtUtc = DateTime.UtcNow.AddDays(-1),
                Photos = [new HandoverPhoto { StoragePublicId = "x", ContentType = "image/jpeg" }],
            });
            await db.SaveChangesAsync();
            var yesterday = today.AddDays(-1).ToString("yyyy-MM-dd");

            Assert.Empty((await manager.GetFromJsonAsync<JsonElement>("/api/handovers")).GetProperty("items").EnumerateArray());
            var old = await manager.GetFromJsonAsync<JsonElement>($"/api/handovers?date={yesterday}");
            Assert.False(old.GetProperty("isToday").GetBoolean());
            Assert.Single(old.GetProperty("items").EnumerateArray());
            Assert.Equal(HttpStatusCode.Conflict, (await manager.GetAsync($"/api/handovers?date={today.AddDays(1):yyyy-MM-dd}")).StatusCode);
        }
    }
}
