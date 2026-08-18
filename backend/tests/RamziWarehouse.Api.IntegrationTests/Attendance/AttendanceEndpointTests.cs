using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using RamziWarehouse.Api.IntegrationTests.Infrastructure;

namespace RamziWarehouse.Api.IntegrationTests.Attendance;

public sealed class AttendanceEndpointTests
{
    [Fact]
    public async Task CheckIn_ShouldReturnUnauthorized_WithoutToken()
    {
        using var factory =
            new RamziWarehouseApiFactory();

        using var client =
            factory.CreateClient();

        using var response =
            await client.PostAsync(
                "/api/attendance/check-in",
                content: null);

        Assert.Equal(
            HttpStatusCode.Unauthorized,
            response.StatusCode);
    }

    [Fact]
    public async Task CheckInAndCheckOut_ShouldCompleteAttendanceFlow()
    {
        using var factory =
            new RamziWarehouseApiFactory();

        using var client =
            factory.CreateClient();

        var accessToken =
            await IntegrationTestAuthHelper
                .LoginAsManagerAsync(client);

        IntegrationTestAuthHelper.SetBearerToken(
            client,
            accessToken);

        using var checkInResponse =
            await client.PostAsync(
                "/api/attendance/check-in",
                content: null);

        Assert.Equal(
            HttpStatusCode.OK,
            checkInResponse.StatusCode);

        var checkInJson =
            await checkInResponse.Content
                .ReadFromJsonAsync<JsonElement>();

        var attendanceId = checkInJson
            .GetProperty("id")
            .GetGuid();

        Assert.NotEqual(
            Guid.Empty,
            attendanceId);

        Assert.True(
            checkInJson
                .GetProperty("isCurrentlyAtWork")
                .GetBoolean());

        Assert.Equal(
            JsonValueKind.Null,
            checkInJson
                .GetProperty("checkedOutAtUtc")
                .ValueKind);

        Assert.Equal(
            JsonValueKind.Null,
            checkInJson
                .GetProperty("deleteAfterUtc")
                .ValueKind);

        using var todayResponse =
            await client.GetAsync(
                "/api/attendance/me/today");

        Assert.Equal(
            HttpStatusCode.OK,
            todayResponse.StatusCode);

        var todayJson =
            await todayResponse.Content
                .ReadFromJsonAsync<JsonElement>();

        Assert.Equal(
            attendanceId,
            todayJson
                .GetProperty("id")
                .GetGuid());

        using var duplicateCheckInResponse =
            await client.PostAsync(
                "/api/attendance/check-in",
                content: null);

        Assert.Equal(
            HttpStatusCode.Conflict,
            duplicateCheckInResponse.StatusCode);

        using var checkOutResponse =
            await client.PostAsync(
                "/api/attendance/check-out",
                content: null);

        Assert.Equal(
            HttpStatusCode.OK,
            checkOutResponse.StatusCode);

        var checkOutJson =
            await checkOutResponse.Content
                .ReadFromJsonAsync<JsonElement>();

        Assert.False(
            checkOutJson
                .GetProperty("isCurrentlyAtWork")
                .GetBoolean());

        var checkedOutAtUtc = checkOutJson
            .GetProperty("checkedOutAtUtc")
            .GetDateTime();

        var completedAtUtc = checkOutJson
            .GetProperty("completedAtUtc")
            .GetDateTime();

        var deleteAfterUtc = checkOutJson
            .GetProperty("deleteAfterUtc")
            .GetDateTime();

        Assert.Equal(
            checkedOutAtUtc,
            completedAtUtc);

        Assert.Equal(
            checkedOutAtUtc.AddDays(40),
            deleteAfterUtc);

        using var duplicateCheckOutResponse =
            await client.PostAsync(
                "/api/attendance/check-out",
                content: null);

        Assert.Equal(
            HttpStatusCode.Conflict,
            duplicateCheckOutResponse.StatusCode);

        using var historyResponse =
    await client.GetAsync(
        "/api/attendance?pageNumber=1&pageSize=20");

        Assert.Equal(
            HttpStatusCode.OK,
            historyResponse.StatusCode);

        var historyJson =
            await historyResponse.Content
                .ReadFromJsonAsync<JsonElement>();

        Assert.Equal(
            1,
            historyJson
                .GetProperty("totalCount")
                .GetInt32());

        var historyItems = historyJson
            .GetProperty("items");

        Assert.Equal(
            1,
            historyItems.GetArrayLength());

        Assert.Equal(
            attendanceId,
            historyItems[0]
                .GetProperty("id")
                .GetGuid());
    }


}