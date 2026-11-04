using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using GrandWall.Api.IntegrationTests.Infrastructure;
using GrandWall.Domain.Entities;
using GrandWall.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace GrandWall.Api.IntegrationTests.ProductReturns;

public sealed class ReturnCodeRuleTests
{
    private static async Task<HttpClient> LoginAdmin(GrandWallApiFactory factory)
    {
        var client = factory.CreateClient();
        IntegrationTestAuthHelper.SetBearerToken(client,
            await IntegrationTestAuthHelper.LoginAsync(client, GrandWallApiFactory.AdminUsername, GrandWallApiFactory.AdminPassword));
        return client;
    }

    private static async Task<(Guid Customer, Guid Warehouse)> Setup(HttpClient client)
    {
        var customer = await client.PostAsJsonAsync("/api/customers", new { name = "Kod qaydası" });
        customer.EnsureSuccessStatusCode();
        var warehouse = (await client.GetFromJsonAsync<JsonElement>("/api/warehouses"))[0].GetProperty("id").GetGuid();
        return ((await customer.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid(), warehouse);
    }

    private static Task<HttpResponseMessage> Create(HttpClient client, Guid customer, Guid warehouse, string code)
        => client.PostAsJsonAsync("/api/product-returns", new
        {
            customerId = customer, warehouseId = warehouse,
            items = new[] { new { productCode = code, batchNumber = "340-1", quantity = 1, productType = 1 } }
        });

    [Fact]
    public async Task AdminRuleRequiresFourDigitsWithZeroAsSecondDigit()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await LoginAdmin(factory);
        var (customer, warehouse) = await Setup(admin);

        (await admin.PutAsJsonAsync("/api/settings/return-codes", new { requiredLength = 4, secondDigitMustBeZero = true })).EnsureSuccessStatusCode();
        var rule = await admin.GetFromJsonAsync<JsonElement>("/api/settings/return-codes");
        Assert.Equal(4, rule.GetProperty("requiredLength").GetInt32());

        Assert.Equal(HttpStatusCode.Conflict, (await Create(admin, customer, warehouse, "101")).StatusCode);     // 3 digits
        Assert.Equal(HttpStatusCode.Conflict, (await Create(admin, customer, warehouse, "10191")).StatusCode);   // 5 digits
        Assert.Equal(HttpStatusCode.Conflict, (await Create(admin, customer, warehouse, "1519")).StatusCode);    // second digit 5
        Assert.Equal(HttpStatusCode.Created, (await Create(admin, customer, warehouse, "5012")).StatusCode);
    }

    [Fact]
    public async Task AReturnThatBreaksANewerRuleCanNotBeSentToTheManager()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await LoginAdmin(factory);
        var (customer, warehouse) = await Setup(admin);
        var created = await Create(admin, customer, warehouse, "101");
        created.EnsureSuccessStatusCode();
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        (await admin.PutAsJsonAsync("/api/settings/return-codes", new { requiredLength = 4, secondDigitMustBeZero = false })).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsync($"/api/product-returns/{id}/submit", null)).StatusCode);
    }

    [Fact]
    public async Task OnlyAdminChangesTheRule()
    {
        using var factory = new GrandWallApiFactory();
        using var manager = factory.CreateClient();
        IntegrationTestAuthHelper.SetBearerToken(manager, await IntegrationTestAuthHelper.LoginAsManagerAsync(manager));

        Assert.Equal(HttpStatusCode.OK, (await manager.GetAsync("/api/settings/return-codes")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await manager.PutAsJsonAsync("/api/settings/return-codes", new { requiredLength = 3, secondDigitMustBeZero = false })).StatusCode);
    }

    [Fact]
    public void ViolationExplainsTheProblem()
    {
        var rule = new ReturnCodeRule { RequiredLength = 4, SecondDigitMustBeZero = true };
        Assert.Null(rule.Violation("1019"));
        Assert.Contains("4 rəqəmli", rule.Violation("101"));
        Assert.Contains("ikinci rəqəmi 0", rule.Violation("1519"));
        Assert.Null(new ReturnCodeRule().Violation("9"));
    }
}
