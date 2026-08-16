using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using RamziWarehouse.Api.IntegrationTests.Infrastructure;

namespace RamziWarehouse.Api.IntegrationTests.Warehouses;

public sealed class WarehouseEndpointTests
    : IClassFixture<RamziWarehouseApiFactory>
{
    private readonly HttpClient _client;

    public WarehouseEndpointTests(
        RamziWarehouseApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetAll_ShouldReturnUnauthorized_WithoutToken()
    {
        using var response =
            await _client.GetAsync("/api/Warehouses");

        Assert.Equal(
            HttpStatusCode.Unauthorized,
            response.StatusCode);
    }

    [Fact]
    public async Task GetAll_ShouldReturnThreeSeededWarehouses()
    {
        var accessToken = await LoginAsync();

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            "/api/Warehouses");

        request.Headers.Authorization =
            new AuthenticationHeaderValue(
                "Bearer",
                accessToken);

        using var response =
            await _client.SendAsync(request);

        Assert.Equal(
            HttpStatusCode.OK,
            response.StatusCode);

        var warehouses =
            await response.Content.ReadFromJsonAsync<
                List<WarehouseResponse>>();

        Assert.NotNull(warehouses);
        Assert.Equal(3, warehouses.Count);

        Assert.Contains(
            warehouses,
            warehouse =>
                warehouse.Name == "Əsas anbar");

        Assert.Contains(
            warehouses,
            warehouse =>
                warehouse.Name == "Kainat");

        Assert.Contains(
            warehouses,
            warehouse =>
                warehouse.Name == "Yevrahome");
    }

    private async Task<string> LoginAsync()
    {
        var loginRequest = new
        {
            username =
                RamziWarehouseApiFactory.ManagerUsername,

            password =
                RamziWarehouseApiFactory.ManagerPassword
        };

        using var response =
            await _client.PostAsJsonAsync(
                "/api/auth/login",
                loginRequest);

        response.EnsureSuccessStatusCode();

        var responseJson =
            await response.Content
                .ReadFromJsonAsync<JsonElement>();

        var accessToken = responseJson
            .GetProperty("accessToken")
            .GetString();

        Assert.False(
            string.IsNullOrWhiteSpace(accessToken));

        return accessToken!;
    }

    private sealed class WarehouseResponse
    {
        public Guid Id { get; init; }

        public string Name { get; init; }
            = string.Empty;

        public bool IsActive { get; init; }
    }
}