using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using GrandWall.Api.IntegrationTests.Infrastructure;

namespace GrandWall.Api.IntegrationTests.ProductReturns;

public sealed class ReturnFinanceTests
{
    private static async Task<HttpClient> Login(GrandWallApiFactory factory, string username, string password)
    {
        var client = factory.CreateClient();
        IntegrationTestAuthHelper.SetBearerToken(client, await IntegrationTestAuthHelper.LoginAsync(client, username, password));
        return client;
    }

    private static Task<HttpClient> LoginAdmin(GrandWallApiFactory factory)
        => Login(factory, GrandWallApiFactory.AdminUsername, GrandWallApiFactory.AdminPassword);

    private static async Task<HttpClient> LoginManager(GrandWallApiFactory factory)
    {
        var client = factory.CreateClient();
        IntegrationTestAuthHelper.SetBearerToken(client, await IntegrationTestAuthHelper.LoginAsManagerAsync(client));
        return client;
    }

    private static async Task<Guid> CreateCustomer(HttpClient client, string name, bool shop = false)
    {
        var response = await client.PostAsJsonAsync("/api/customers", new { name, phoneNumber = "", note = "", isAccountCustomer = shop });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static async Task<Guid> Warehouse(HttpClient client)
        => (await client.GetFromJsonAsync<JsonElement>("/api/warehouses"))[0].GetProperty("id").GetGuid();

    private static async Task<Guid> CreateReturn(HttpClient client, Guid customer, Guid warehouse, decimal amount, string code = "510", string batch = "611-1")
    {
        var response = await client.PostAsJsonAsync("/api/product-returns", new
        {
            customerId = customer, warehouseId = warehouse, amount,
            items = new[] { new { productCode = code, batchNumber = batch, quantity = 1, productType = 1 } }
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static async Task<decimal> Remaining(HttpClient client, Guid customer)
        => (await client.GetFromJsonAsync<JsonElement>($"/api/customer-accounts/{customer}")).GetProperty("remainingDebt").GetDecimal();

    private static async Task WriteDebt(HttpClient client, Guid customer, decimal daily, decimal? old = null)
        => (await client.PutAsJsonAsync("/api/customer-accounts/day/debts", new { items = new[] { new { customerId = customer, dailyDebt = daily, oldDebt = old } } })).EnsureSuccessStatusCode();

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    [InlineData(4)]
    [InlineData(5)]
    public async Task EveryRoleCanCreateACustomerAndTheShopFlagIsStored(int role)
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await LoginAdmin(factory);
        var username = "customer." + Guid.NewGuid().ToString("N");
        (await admin.PostAsJsonAsync("/api/users", new { fullName = "İşçi", username, password = "EmployeeTest123!", role })).EnsureSuccessStatusCode();
        using var worker = await Login(factory, username, "EmployeeTest123!");

        var id = await CreateCustomer(worker, "Yeni dükan", shop: true);

        var customer = await admin.GetFromJsonAsync<JsonElement>($"/api/customers/{id}");
        Assert.True(customer.GetProperty("isAccountCustomer").GetBoolean());
        var shops = await admin.GetFromJsonAsync<JsonElement>("/api/customers?isAccountCustomer=true");
        Assert.Contains(shops.EnumerateArray(), c => c.GetProperty("id").GetGuid() == id);
    }

    [Fact]
    public async Task ManagerApprovalCreditsTheDebtOnce()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await LoginAdmin(factory);
        using var manager = await LoginManager(factory);
        var customer = await CreateCustomer(admin, "Maliyyə dükanı", shop: true);
        var warehouse = await Warehouse(admin);
        var person = (await (await admin.PostAsJsonAsync("/api/return-persons", new { name = "Babək", isActive = true })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await WriteDebt(admin, customer, 100, old: 400);

        var created = await admin.PostAsJsonAsync("/api/product-returns", new
        {
            customerId = customer, warehouseId = warehouse, amount = 20, returnPersonId = person,
            items = new[] { new { productCode = "510", batchNumber = "611-1", quantity = 1, productType = 1 } }
        });
        created.EnsureSuccessStatusCode();
        var record = await created.Content.ReadFromJsonAsync<JsonElement>();
        var id = record.GetProperty("id").GetGuid();
        Assert.Equal(1, record.GetProperty("status").GetInt32());
        Assert.Equal("Babək", record.GetProperty("returnPersonName").GetString());
        Assert.Equal(500, await Remaining(admin, customer));

        (await admin.PostAsync($"/api/product-returns/{id}/submit", null)).EnsureSuccessStatusCode();
        Assert.Equal(500, await Remaining(admin, customer));   // submitting alone never reduces the debt

        (await manager.PostAsJsonAsync($"/api/product-returns/{id}/complete", new { note = "" })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await manager.PostAsJsonAsync($"/api/product-returns/{id}/complete", new { note = "" })).StatusCode);

        Assert.Equal(480, await Remaining(admin, customer));
        var done = await manager.GetFromJsonAsync<JsonElement>($"/api/product-returns/{id}");
        Assert.Equal(2, done.GetProperty("status").GetInt32());
        Assert.Equal(20, done.GetProperty("appliedAmount").GetDecimal());
    }

    [Fact]
    public async Task ReturnCreditedAtTheAcotIsNotCreditedAgainWhenTheManagerApproves()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await LoginAdmin(factory);
        using var manager = await LoginManager(factory);
        var customer = await CreateCustomer(admin, "İkiqat yoxlaması", shop: true);
        var warehouse = await Warehouse(admin);
        var id = await CreateReturn(admin, customer, warehouse, 0);
        await WriteDebt(admin, customer, 100);

        var settle = await admin.PostAsJsonAsync("/api/customer-accounts/settlements", new
        {
            operationId = Guid.NewGuid(), customerId = customer, cash = 0m, card = 0m, bonus = 0m, carryToTomorrow = true,
            returns = new[] { new { returnId = id, amount = 30m } }
        });
        settle.EnsureSuccessStatusCode();
        Assert.Equal(70, await Remaining(admin, customer));

        (await admin.PostAsync($"/api/product-returns/{id}/submit", null)).EnsureSuccessStatusCode();
        (await manager.PostAsJsonAsync($"/api/product-returns/{id}/complete", new { note = "" })).EnsureSuccessStatusCode();

        Assert.Equal(70, await Remaining(admin, customer));    // approval found it already credited

        var again = await admin.PostAsJsonAsync("/api/customer-accounts/settlements", new
        {
            operationId = Guid.NewGuid(), customerId = customer, cash = 0m, card = 0m, bonus = 0m, carryToTomorrow = true,
            returns = new[] { new { returnId = id, amount = 30m } }
        });
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
    }

    [Fact]
    public async Task CancellingACreditedReturnGivesTheDebtBack()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await LoginAdmin(factory);
        using var manager = await LoginManager(factory);
        var customer = await CreateCustomer(admin, "Ləğv yoxlaması", shop: true);
        var warehouse = await Warehouse(admin);
        var id = await CreateReturn(admin, customer, warehouse, 0);
        await WriteDebt(admin, customer, 100);
        (await admin.PostAsJsonAsync("/api/customer-accounts/settlements", new
        {
            operationId = Guid.NewGuid(), customerId = customer, cash = 0m, card = 0m, bonus = 0m, carryToTomorrow = true,
            returns = new[] { new { returnId = id, amount = 40m } }
        })).EnsureSuccessStatusCode();
        Assert.Equal(60, await Remaining(admin, customer));

        (await manager.PostAsJsonAsync($"/api/product-returns/{id}/cancel", new { note = "Rədd edildi" })).EnsureSuccessStatusCode();

        Assert.Equal(100, await Remaining(admin, customer));
        var listed = await admin.GetFromJsonAsync<JsonElement>($"/api/product-returns?customerId={customer}&unapplied=true");
        Assert.Equal(0, listed.GetProperty("totalCount").GetInt32());   // cancelled returns are never offered again
    }

    [Fact]
    public async Task CancelledOrCreditedReturnsAreNotOfferedAtTheAcot()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await LoginAdmin(factory);
        var customer = await CreateCustomer(admin, "Seçim siyahısı", shop: true);
        var warehouse = await Warehouse(admin);
        var open = await CreateReturn(admin, customer, warehouse, 0, "1019", "340-1");
        var used = await CreateReturn(admin, customer, warehouse, 0, "2020", "5");
        await WriteDebt(admin, customer, 100);
        (await admin.PostAsJsonAsync("/api/customer-accounts/settlements", new
        {
            operationId = Guid.NewGuid(), customerId = customer, cash = 0m, card = 0m, bonus = 0m, carryToTomorrow = true,
            returns = new[] { new { returnId = used, amount = 10m } }
        })).EnsureSuccessStatusCode();

        var listed = await admin.GetFromJsonAsync<JsonElement>($"/api/product-returns?customerId={customer}&unapplied=true");

        Assert.Equal(open, Assert.Single(listed.GetProperty("items").EnumerateArray()).GetProperty("id").GetGuid());
    }

    [Theory]
    [InlineData("10A9", "10")]
    [InlineData("1019", "B-1")]
    [InlineData("-1019", "10")]
    [InlineData("10 19", "10")]
    public async Task CodesAndBatchesAcceptOnlyDigitsAndHyphens(string code, string batch)
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await LoginAdmin(factory);
        var customer = await CreateCustomer(admin, "Kod yoxlaması");
        var warehouse = await Warehouse(admin);

        var response = await admin.PostAsJsonAsync("/api/product-returns", new
        {
            customerId = customer, warehouseId = warehouse,
            items = new[] { new { productCode = code, batchNumber = batch, quantity = 1, productType = 1 } }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task EmployeeNameIsRequiredWhenNamesAreConfiguredAndSearchFindsByCode()
    {
        using var factory = new GrandWallApiFactory();
        using var admin = await LoginAdmin(factory);
        var customer = await CreateCustomer(admin, "Rafil İtalux");
        var warehouse = await Warehouse(admin);
        var first = await CreateReturn(admin, customer, warehouse, 0, "1019", "340-1");
        await CreateReturn(admin, customer, warehouse, 0, "777", "8");

        var byCode = await admin.GetFromJsonAsync<JsonElement>("/api/product-returns?search=1019");
        Assert.Equal(first, Assert.Single(byCode.GetProperty("items").EnumerateArray()).GetProperty("id").GetGuid());
        var byName = await admin.GetFromJsonAsync<JsonElement>("/api/product-returns?search=Rafil");
        Assert.Equal(2, byName.GetProperty("totalCount").GetInt32());

        (await admin.PostAsJsonAsync("/api/return-persons", new { name = "Babək", isActive = true })).EnsureSuccessStatusCode();
        var withoutName = await admin.PostAsJsonAsync("/api/product-returns", new
        {
            customerId = customer, warehouseId = warehouse,
            items = new[] { new { productCode = "101", batchNumber = "10", quantity = 1, productType = 1 } }
        });
        Assert.Equal(HttpStatusCode.Conflict, withoutName.StatusCode);
    }
}
