using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace GrandWall.Api.IntegrationTests.Infrastructure;

internal static class IntegrationTestAuthHelper
{
    public static Task<string> LoginAsManagerAsync(
        HttpClient client)
    {
        return LoginAsync(
            client,
            GrandWallApiFactory.ManagerUsername,
            GrandWallApiFactory.ManagerPassword);
    }

    public static async Task<string> LoginAsync(
        HttpClient client,
        string username,
        string password)
    {
        var loginRequest = new
        {
            username,
            password
        };

        using var response =
            await client.PostAsJsonAsync(
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

    public static void SetBearerToken(
        HttpClient client,
        string accessToken)
    {
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue(
                "Bearer",
                accessToken);
    }
}