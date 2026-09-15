using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using GrandWall.Api.IntegrationTests.Infrastructure;
using GrandWall.Application.Common.Notifications;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Persistence;

namespace GrandWall.Api.IntegrationTests.Orders;

public sealed class OrderAuthorizationTests
{
    private const string TestUserPassword =
        "OrderTest123!";

    [Theory]
    [InlineData(UserRole.WarehouseWorker)]
    [InlineData(UserRole.Driver)]
    public async Task Create_ShouldReturnForbidden_ForNonManager(
        UserRole userRole)
    {
        using var factory =
            new GrandWallApiFactory();

        using var client =
            factory.CreateClient();

        var testData = await SeedTestDataAsync(
            factory,
            userRole,
            createTestUser: true);

        var accessToken =
            await IntegrationTestAuthHelper.LoginAsync(
                client,
                testData.Username!,
                TestUserPassword);

        IntegrationTestAuthHelper.SetBearerToken(
            client,
            accessToken);

        using var getOrdersResponse =
            await client.GetAsync(
                "/api/Orders?pageNumber=1&pageSize=20");

        Assert.Equal(
            HttpStatusCode.OK,
            getOrdersResponse.StatusCode);

        var orderRequest = CreateOrderRequest(
            testData,
            $"TEST-FORBIDDEN-{Guid.NewGuid():N}");

        using var createResponse =
            await client.PostAsJsonAsync(
                "/api/Orders",
                orderRequest);

        Assert.Equal(
            HttpStatusCode.Forbidden,
            createResponse.StatusCode);
    }

    [Fact]
    public async Task Create_ShouldCreateOrderAndTelegramOutbox_ForManager()
    {
        using var factory =
            new GrandWallApiFactory();

        using var client =
            factory.CreateClient();

        var testData = await SeedTestDataAsync(
            factory,
            UserRole.Manager,
            createTestUser: false);

        var accessToken =
            await IntegrationTestAuthHelper
                .LoginAsManagerAsync(client);

        IntegrationTestAuthHelper.SetBearerToken(
            client,
            accessToken);

        var orderNumber =
            $"TEST-ORDER-{Guid.NewGuid():N}";

        var orderRequest = CreateOrderRequest(
            testData,
            orderNumber);

        using var createResponse =
            await client.PostAsJsonAsync(
                "/api/Orders",
                orderRequest);

        Assert.Equal(
            HttpStatusCode.Created,
            createResponse.StatusCode);

        var responseJson =
            await createResponse.Content
                .ReadFromJsonAsync<JsonElement>();

        var orderId = responseJson
            .GetProperty("id")
            .GetGuid();

        Assert.NotEqual(
            Guid.Empty,
            orderId);

        Assert.Equal(
            orderNumber,
            responseJson
                .GetProperty("orderNumber")
                .GetString());

        Assert.Equal(
            (int)OrderStatus.Created,
            responseJson
                .GetProperty("status")
                .GetInt32());

        using var verificationScope =
            factory.Services.CreateScope();

        var dbContext = verificationScope
            .ServiceProvider
            .GetRequiredService<AppDbContext>();

        var savedOrder = await dbContext.Orders
            .AsNoTracking()
            .Include(order => order.Items)
            .SingleAsync(order =>
                order.Id == orderId);

        Assert.Equal(
            orderNumber,
            savedOrder.OrderNumber);

        Assert.Single(savedOrder.Items);

        var savedItem =
            savedOrder.Items.Single();

        Assert.Equal(
            "5004",
            savedItem.ProductCode);

        Assert.Equal(
            "814",
            savedItem.BatchNumber);

        Assert.Equal(
            4,
            savedItem.Quantity);

        var outboxMessage =
            await dbContext.TelegramOutboxMessages
                .AsNoTracking()
                .SingleAsync(message =>
                    message.RelatedEntityType ==
                        TelegramRelatedEntityTypes.Order &&
                    message.RelatedEntityId == orderId);

        Assert.Equal(
            TelegramChannel.Orders,
            outboxMessage.Channel);

        Assert.Contains(
            orderNumber,
            outboxMessage.Text,
            StringComparison.Ordinal);
    }

    private static async Task<OrderTestData>
        SeedTestDataAsync(
            GrandWallApiFactory factory,
            UserRole userRole,
            bool createTestUser)
    {
        using var scope =
            factory.Services.CreateScope();

        var dbContext = scope.ServiceProvider
            .GetRequiredService<AppDbContext>();

        var warehouseId = await dbContext.Warehouses
            .Where(warehouse =>
                warehouse.Name == "Əsas anbar")
            .Select(warehouse => warehouse.Id)
            .SingleAsync();

        var customer = new Customer
        {
            Name = "Integration Test Müştərisi",
            PhoneNumber = "0500000000",
            Note = "Order integration testi",
            IsActive = true
        };

        dbContext.Customers.Add(customer);

        string? username = null;

        if (createTestUser)
        {
            username =
                $"order.{userRole.ToString().ToLowerInvariant()}." +
                $"{Guid.NewGuid():N}";

            var user = new User
            {
                FullName =
                    $"Integration {userRole}",

                Username = username,
                Role = userRole,
                IsActive = true
            };

            var passwordHasher = scope.ServiceProvider
                .GetRequiredService<
                    IPasswordHasher<User>>();

            user.PasswordHash =
                passwordHasher.HashPassword(
                    user,
                    TestUserPassword);

            dbContext.Users.Add(user);
        }

        await dbContext.SaveChangesAsync();

        return new OrderTestData(
            customer.Id,
            warehouseId,
            username);
    }

    private static object CreateOrderRequest(
        OrderTestData testData,
        string orderNumber)
    {
        return new
        {
            orderNumber,
            orderDate = DateTime.UtcNow,
            customerId = testData.CustomerId,
            warehouseId = testData.WarehouseId,
            note = "Integration test sifarişi",
            items = new[]
            {
                new
                {
                    productCode = "5004",
                    partyNumber = "814",
                    productType =
                        (int)ProductType.Product,
                    quantity = 4
                }
            }
        };
    }

    private sealed record OrderTestData(
        Guid CustomerId,
        Guid WarehouseId,
        string? Username);
}