using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using RamziWarehouse.Api.IntegrationTests.Infrastructure;

namespace RamziWarehouse.Api.IntegrationTests.Authentication;

public sealed class AuthenticationTests
    : IClassFixture<RamziWarehouseApiFactory>
{
    private readonly HttpClient _client;

    public AuthenticationTests(
        RamziWarehouseApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Login_ShouldReturnAccessAndRefreshTokens()
    {
        var request = new
        {
            username =
                RamziWarehouseApiFactory.ManagerUsername,

            password =
                RamziWarehouseApiFactory.ManagerPassword
        };

        using var response =
            await _client.PostAsJsonAsync(
                "/api/auth/login",
                request);

        Assert.Equal(
            HttpStatusCode.OK,
            response.StatusCode);

        var responseJson =
            await response.Content
                .ReadFromJsonAsync<JsonElement>();

        var accessToken = responseJson
            .GetProperty("accessToken")
            .GetString();

        var refreshToken = responseJson
            .GetProperty("refreshToken")
            .GetString();

        Assert.False(
            string.IsNullOrWhiteSpace(accessToken));

        Assert.False(
            string.IsNullOrWhiteSpace(refreshToken));
    }

    [Fact]
    public async Task Login_ShouldReturnUnauthorized_ForWrongPassword()
    {
        var request = new
        {
            username =
                RamziWarehouseApiFactory.ManagerUsername,

            password = "WrongPassword123!"
        };

        using var response =
            await _client.PostAsJsonAsync(
                "/api/auth/login",
                request);

        Assert.Equal(
            HttpStatusCode.Unauthorized,
            response.StatusCode);
    }
}