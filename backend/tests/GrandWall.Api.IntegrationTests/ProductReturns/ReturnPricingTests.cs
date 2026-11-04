using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using GrandWall.Api.IntegrationTests.Infrastructure;

namespace GrandWall.Api.IntegrationTests.ProductReturns;

public sealed class ReturnPricingTests
{
    private static async Task<HttpClient> LoginAdmin(GrandWallApiFactory factory)
    {
        var client = factory.CreateClient();
        IntegrationTestAuthHelper.SetBearerToken(client,
            await IntegrationTestAuthHelper.LoginAsync(client, GrandWallApiFactory.AdminUsername, GrandWallApiFactory.AdminPassword));
        return client;
    }

    private static async Task<HttpClient> LoginManager(GrandWallApiFactory factory)
    {
        var client = factory.CreateClient();
        IntegrationTestAuthHelper.SetBearerToken(client, await IntegrationTestAuthHelper.LoginAsManagerAsync(client));
        return client;
    }

    private static async Task<Guid> Shop(HttpClient client, string name)
    {
        var response = await client.PostAsJsonAsync("/api/customers", new { name, isAccountCustomer = true });
        response.EnsureSuccessStatusCode();
        var id = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        (await client.PutAsJsonAsync($"/api/customers/{id}/price-rules", new[]
        {
            new { codePrefix = "10", price = 26m },
            new { codePrefix = "50", price = 23m }
        })).EnsureSuccessStatusCode();
        return id;
    }

    private static async Task<Guid> Warehouse(HttpClient client)
        => (await client.GetFromJsonAsync<JsonElement>("/api/warehouses"))[0].GetProperty("id").GetGuid();

    private static async Task<JsonElement> CreateReturn(HttpClient client, Guid customer, Guid warehouse, params object[] items)
    {
        var response = await client.PostAsJsonAsync("/api/product-returns", new { customerId = customer, warehouseId = warehouse, items });
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private static async Task<JsonElement> Account(HttpClient client, Guid customer)
        => await client.GetFromJsonAsync<JsonElement>($"/api/customer-accounts/{customer}");

    private static decimal Net(JsonElement account)
        => account.GetProperty("remainingDebt").GetDecimal() - account.GetProperty("advance").GetDecimal();

    [Fact]
    public async Task AmountIsPricedFromTheCustomerListAndShowcaseItemsAreFree()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await LoginAdmin(factory);
        var customer = await Shop(admin, "Qiymət dükanı");
        var warehouse = await Warehouse(admin);

        var record = await CreateReturn(admin, customer, warehouse,
            new { productCode = "5012", batchNumber = "340-1", quantity = 2, productType = 1 },   // 2 x 23
            new { productCode = "1019", batchNumber = "7", quantity = 1, productType = 1 },       // 1 x 26
            new { productCode = "1020", batchNumber = "8", quantity = 3, productType = 2 },       // showcase: free
            new { productCode = "9001", batchNumber = "9", quantity = 1, productType = 1 });      // no price

        Assert.Equal(72, record.GetProperty("amount").GetDecimal());
        var rules = await admin.GetFromJsonAsync<JsonElement>($"/api/customers/{customer}/price-rules");
        Assert.Equal(2, rules.GetArrayLength());
    }

    [Fact]
    public async Task SendingToTheManagerTakesTheReturnOffTheDebtAndApprovalKeepsIt()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await LoginAdmin(factory);
        using var manager = await LoginManager(factory);
        var customer = await Shop(admin, "Göndərmə dükanı");
        var warehouse = await Warehouse(admin);
        (await admin.PutAsJsonAsync("/api/customer-accounts/day/debts", new { items = new[] { new { customerId = customer, dailyDebt = 100m } } })).EnsureSuccessStatusCode();
        var id = (await CreateReturn(admin, customer, warehouse, new { productCode = "5001", batchNumber = "1", quantity = 2, productType = 1 })).GetProperty("id").GetGuid();

        Assert.Equal(100, Net(await Account(admin, customer)));             // not before sending
        (await admin.PostAsync($"/api/product-returns/{id}/submit", null)).EnsureSuccessStatusCode();
        Assert.Equal(54, Net(await Account(admin, customer)));              // 100 - 46

        (await manager.PostAsJsonAsync($"/api/product-returns/{id}/complete", new { note = "" })).EnsureSuccessStatusCode();
        Assert.Equal(54, Net(await Account(admin, customer)));              // approval does not credit twice
    }

    [Fact]
    public async Task RejectionOrDeletionGivesTheCreditBack()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await LoginAdmin(factory);
        using var manager = await LoginManager(factory);
        var customer = await Shop(admin, "Rədd dükanı");
        var warehouse = await Warehouse(admin);
        (await admin.PutAsJsonAsync("/api/customer-accounts/day/debts", new { items = new[] { new { customerId = customer, dailyDebt = 100m } } })).EnsureSuccessStatusCode();

        var rejected = (await CreateReturn(admin, customer, warehouse, new { productCode = "1001", batchNumber = "1", quantity = 1, productType = 1 })).GetProperty("id").GetGuid();
        (await admin.PostAsync($"/api/product-returns/{rejected}/submit", null)).EnsureSuccessStatusCode();
        Assert.Equal(74, Net(await Account(admin, customer)));
        (await manager.PostAsJsonAsync($"/api/product-returns/{rejected}/cancel", new { note = "Rədd" })).EnsureSuccessStatusCode();
        Assert.Equal(100, Net(await Account(admin, customer)));

        var deleted = await CreateReturn(admin, customer, warehouse, new { productCode = "1002", batchNumber = "1", quantity = 1, productType = 1 });
        var deletedId = deleted.GetProperty("id").GetGuid();
        var submitted = await (await admin.PostAsync($"/api/product-returns/{deletedId}/submit", null)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(74, Net(await Account(admin, customer)));
        var delete = await admin.SendAsync(new HttpRequestMessage(HttpMethod.Delete, $"/api/product-returns/{deletedId}")
        {
            Content = JsonContent.Create(new { expectedRevision = submitted.GetProperty("revision").GetGuid(), reason = "Səhv qeyd" })
        });
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Equal(100, Net(await Account(admin, customer)));
    }

    [Fact]
    public async Task ReturnWorthMoreThanTheDebtLeavesUsOwingAndAPayoutSettlesIt()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await LoginAdmin(factory);
        var customer = await Shop(admin, "Artıq vazvrat");
        var warehouse = await Warehouse(admin);
        (await admin.PutAsJsonAsync("/api/customer-accounts/day/debts", new { items = new[] { new { customerId = customer, dailyDebt = 30m } } })).EnsureSuccessStatusCode();
        var id = (await CreateReturn(admin, customer, warehouse, new { productCode = "5001", batchNumber = "1", quantity = 2, productType = 1 })).GetProperty("id").GetGuid();
        (await admin.PostAsync($"/api/product-returns/{id}/submit", null)).EnsureSuccessStatusCode();

        Assert.Equal(-16, Net(await Account(admin, customer)));             // we owe the customer 16

        var tooMuch = await admin.PostAsJsonAsync("/api/customer-accounts/payouts", new { operationId = Guid.NewGuid(), customerId = customer, cash = 20m, card = 0m });
        Assert.Equal(HttpStatusCode.Conflict, tooMuch.StatusCode);

        var operation = Guid.NewGuid();
        (await admin.PostAsJsonAsync("/api/customer-accounts/payouts", new { operationId = operation, customerId = customer, cash = 10m, card = 6m })).EnsureSuccessStatusCode();
        (await admin.PostAsJsonAsync("/api/customer-accounts/payouts", new { operationId = operation, customerId = customer, cash = 10m, card = 6m })).EnsureSuccessStatusCode();
        Assert.Equal(0, Net(await Account(admin, customer)));

        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(4)).ToString("yyyy-MM-dd");
        var day = await admin.GetFromJsonAsync<JsonElement>($"/api/customer-accounts/day?date={today}");
        Assert.Equal(16, day.GetProperty("paidOut").GetDecimal());
        Assert.Equal(-10, day.GetProperty("cash").GetDecimal());           // collected money goes down
        Assert.Equal(-6, day.GetProperty("card").GetDecimal());
    }

    [Fact]
    public async Task ResetTodayRemovesOnlyTodaysEntriesAndWipeClearsEverything()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await LoginAdmin(factory);
        var customer = await Shop(admin, "Sıfırlama dükanı");
        (await admin.PostAsJsonAsync("/api/customer-accounts/adjust", new { customerId = customer, target = "old", mode = "add", amount = 100m, reason = "Köhnə borc" })).EnsureSuccessStatusCode();
        (await admin.PutAsJsonAsync("/api/customer-accounts/day/debts", new { items = new[] { new { customerId = customer, dailyDebt = 10m } } })).EnsureSuccessStatusCode();
        (await admin.PostAsJsonAsync("/api/customer-accounts/settlements", new
        {
            operationId = Guid.NewGuid(), customerId = customer, cash = 15m, card = 0m, bonus = 0m, carryToTomorrow = true, returns = Array.Empty<object>()
        })).EnsureSuccessStatusCode();
        Assert.Equal(95, Net(await Account(admin, customer)));

        var reset = await admin.PostAsJsonAsync($"/api/customer-accounts/{customer}/reset-today", new { reason = "Səhv yazılıb" });
        reset.EnsureSuccessStatusCode();
        var afterReset = await reset.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, Net(afterReset));                                    // the old debt was also written today
        Assert.Contains(afterReset.GetProperty("audit").EnumerateArray(), a => a.GetProperty("description").GetString()!.Contains("Səhv yazılıb"));

        (await admin.PostAsJsonAsync("/api/customer-accounts/adjust", new { customerId = customer, target = "daily", mode = "add", amount = 40m, reason = "Yeni borc" })).EnsureSuccessStatusCode();
        var wiped = await admin.PostAsJsonAsync($"/api/customer-accounts/{customer}/wipe", new { reason = "Yeni müştəri kimi" });
        wiped.EnsureSuccessStatusCode();
        var afterWipe = await wiped.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, Net(afterWipe));
        Assert.Empty(afterWipe.GetProperty("days").EnumerateArray());
    }

    [Fact]
    public async Task OnlyDigitsArePrefixesAndOnlyAdminWipes()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await LoginAdmin(factory);
        var customer = await Shop(admin, "Qayda dükanı");

        var bad = await admin.PutAsJsonAsync($"/api/customers/{customer}/price-rules", new[] { new { codePrefix = "A1", price = 5m } });
        Assert.Equal(HttpStatusCode.Conflict, bad.StatusCode);
        var duplicate = await admin.PutAsJsonAsync($"/api/customers/{customer}/price-rules", new[] { new { codePrefix = "10", price = 5m }, new { codePrefix = "10", price = 6m } });
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

        var username = "op." + Guid.NewGuid().ToString("N");
        (await admin.PostAsJsonAsync("/api/users", new { fullName = "Operator", username, password = "EmployeeTest123!", role = 5 })).EnsureSuccessStatusCode();
        using var operatorClient = factory.CreateClient();
        IntegrationTestAuthHelper.SetBearerToken(operatorClient, await IntegrationTestAuthHelper.LoginAsync(operatorClient, username, "EmployeeTest123!"));
        Assert.Equal(HttpStatusCode.Forbidden, (await operatorClient.PostAsJsonAsync($"/api/customer-accounts/{customer}/wipe", new { reason = "Sınaq" })).StatusCode);
    }
}
