using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RamziWarehouse.Api.IntegrationTests.Infrastructure;
using RamziWarehouse.Application.Common.Notifications;
using RamziWarehouse.Domain.Entities;
using RamziWarehouse.Domain.Enums;
using RamziWarehouse.Infrastructure.Persistence;

namespace RamziWarehouse.Api.IntegrationTests.Orders;

public sealed class OrderWorkflowTests
{
    private const string TestPassword =
        "WorkflowTest123!";

    [Fact]
    public async Task Order_ShouldMoveFromCreatedToDelivered()
    {
        using var factory =
            new RamziWarehouseApiFactory();

        using var client =
            factory.CreateClient();

        var testData =
            await SeedWorkflowDataAsync(factory);

        var managerToken =
            await IntegrationTestAuthHelper
                .LoginAsManagerAsync(client);

        IntegrationTestAuthHelper.SetBearerToken(
            client,
            managerToken);

        var orderId = await CreateOrderAsync(
            client,
            testData);

        var workerToken =
            await IntegrationTestAuthHelper.LoginAsync(
                client,
                testData.WorkerUsername,
                TestPassword);

        IntegrationTestAuthHelper.SetBearerToken(
            client,
            workerToken);

        await StartPreparationAsync(
            client,
            orderId);

        await UploadPreparationPhotoAsync(
            client,
            orderId);

        await CompletePreparationAsync(
            client,
            orderId);

        var driverToken =
            await IntegrationTestAuthHelper.LoginAsync(
                client,
                testData.DriverUsername,
                TestPassword);

        IntegrationTestAuthHelper.SetBearerToken(
            client,
            driverToken);

        await UploadDeliveryPhotoAsync(
            client,
            orderId);

        await CompleteDeliveryAsync(
            client,
            orderId);

        await VerifyDatabaseAsync(
            factory,
            orderId);
    }

    private static async Task<Guid> CreateOrderAsync(
        HttpClient client,
        WorkflowTestData testData)
    {
        var orderNumber =
            $"WF-{Guid.NewGuid():N}";

        var request = new
        {
            orderNumber,
            orderDate = DateTime.UtcNow,
            customerId = testData.CustomerId,
            warehouseId = testData.WarehouseId,
            note = "Tam workflow integration testi",
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

        using var response =
            await client.PostAsJsonAsync(
                "/api/Orders",
                request);

        Assert.Equal(
            HttpStatusCode.Created,
            response.StatusCode);

        var responseJson =
            await response.Content
                .ReadFromJsonAsync<JsonElement>();

        Assert.Equal(
            (int)OrderStatus.Created,
            responseJson
                .GetProperty("status")
                .GetInt32());

        return responseJson
            .GetProperty("id")
            .GetGuid();
    }

    private static async Task StartPreparationAsync(
        HttpClient client,
        Guid orderId)
    {
        using var response =
            await client.PostAsync(
                $"/api/Orders/{orderId}/start-preparation",
                content: null);

        Assert.Equal(
            HttpStatusCode.OK,
            response.StatusCode);

        var responseJson =
            await response.Content
                .ReadFromJsonAsync<JsonElement>();

        Assert.Equal(
            (int)OrderStatus.InPreparation,
            responseJson
                .GetProperty("status")
                .GetInt32());
    }

    private static async Task UploadPreparationPhotoAsync(
        HttpClient client,
        Guid orderId)
    {
        using var content =
            CreateImageContent(
                "preparation-proof.jpg");

        using var response =
            await client.PostAsync(
                $"/api/orders/{orderId}/preparation/photos",
                content);

        Assert.Equal(
            HttpStatusCode.OK,
            response.StatusCode);

        var responseJson =
            await response.Content
                .ReadFromJsonAsync<JsonElement>();

        Assert.NotEqual(
            Guid.Empty,
            responseJson
                .GetProperty("id")
                .GetGuid());
    }

    private static async Task CompletePreparationAsync(
        HttpClient client,
        Guid orderId)
    {
        using var response =
            await client.PostAsync(
                $"/api/orders/{orderId}/preparation/complete",
                content: null);

        Assert.Equal(
            HttpStatusCode.OK,
            response.StatusCode);

        var responseJson =
            await response.Content
                .ReadFromJsonAsync<JsonElement>();

        Assert.Equal(
            (int)OrderStatus.ReadyForDelivery,
            responseJson
                .GetProperty("status")
                .GetInt32());
    }

    private static async Task UploadDeliveryPhotoAsync(
        HttpClient client,
        Guid orderId)
    {
        using var content =
            CreateImageContent(
                "delivery-proof.jpg");

        using var response =
            await client.PostAsync(
                $"/api/orders/{orderId}/delivery/photos",
                content);

        Assert.Equal(
            HttpStatusCode.OK,
            response.StatusCode);

        var responseJson =
            await response.Content
                .ReadFromJsonAsync<JsonElement>();

        Assert.NotEqual(
            Guid.Empty,
            responseJson
                .GetProperty("id")
                .GetGuid());
    }

    private static async Task CompleteDeliveryAsync(
        HttpClient client,
        Guid orderId)
    {
        var request = new
        {
            note = "Məhsullar mağazada təhvil verildi."
        };

        using var response =
            await client.PostAsJsonAsync(
                $"/api/orders/{orderId}/delivery/complete",
                request);

        Assert.Equal(
            HttpStatusCode.OK,
            response.StatusCode);

        var responseJson =
            await response.Content
                .ReadFromJsonAsync<JsonElement>();

        Assert.Equal(
            (int)OrderStatus.Delivered,
            responseJson
                .GetProperty("status")
                .GetInt32());

        Assert.NotEqual(
            JsonValueKind.Null,
            responseJson
                .GetProperty("completedAtUtc")
                .ValueKind);

        Assert.NotEqual(
            JsonValueKind.Null,
            responseJson
                .GetProperty("deleteAfterUtc")
                .ValueKind);
    }

    private static MultipartFormDataContent
        CreateImageContent(string fileName)
    {
        byte[] testImageBytes =
        [
            0xFF,
            0xD8,
            0xFF,
            0xE0,
            0x00,
            0x10,
            0x4A,
            0x46,
            0x49,
            0x46,
            0x00,
            0x01,
            0xFF,
            0xD9
        ];

        var fileContent =
            new ByteArrayContent(testImageBytes);

        fileContent.Headers.ContentType =
            new MediaTypeHeaderValue("image/jpeg");

        var multipartContent =
            new MultipartFormDataContent();

        multipartContent.Add(
            fileContent,
            "file",
            fileName);

        return multipartContent;
    }

    private static async Task<WorkflowTestData>
        SeedWorkflowDataAsync(
            RamziWarehouseApiFactory factory)
    {
        using var scope =
            factory.Services.CreateScope();

        var dbContext = scope.ServiceProvider
            .GetRequiredService<AppDbContext>();

        var passwordHasher = scope.ServiceProvider
            .GetRequiredService<
                IPasswordHasher<User>>();

        var worker = new User
        {
            FullName = "Test Anbar İşçisi",
            Username = "workflow.worker",
            Role = UserRole.WarehouseWorker,
            IsActive = true
        };

        worker.PasswordHash =
            passwordHasher.HashPassword(
                worker,
                TestPassword);

        var driver = new User
        {
            FullName = "Test Sürücü",
            Username = "workflow.driver",
            Role = UserRole.Driver,
            IsActive = true
        };

        driver.PasswordHash =
            passwordHasher.HashPassword(
                driver,
                TestPassword);

        var customer = new Customer
        {
            Name = "Workflow Test Müştərisi",
            PhoneNumber = "0500000001",
            Note = "Tam sifariş axını testi",
            IsActive = true
        };

        var warehouseId = await dbContext.Warehouses
            .Where(warehouse =>
                warehouse.Name == "Əsas anbar")
            .Select(warehouse => warehouse.Id)
            .SingleAsync();

        dbContext.Users.AddRange(
            worker,
            driver);

        dbContext.Customers.Add(customer);

        await dbContext.SaveChangesAsync();

        return new WorkflowTestData(
            worker.Username,
            driver.Username,
            customer.Id,
            warehouseId);
    }

    private static async Task VerifyDatabaseAsync(
        RamziWarehouseApiFactory factory,
        Guid orderId)
    {
        using var scope =
            factory.Services.CreateScope();

        var dbContext = scope.ServiceProvider
            .GetRequiredService<AppDbContext>();

        var order = await dbContext.Orders
            .AsNoTracking()
            .Include(currentOrder =>
                currentOrder.PreparationPhotos)
            .Include(currentOrder =>
                currentOrder.Delivery)
                .ThenInclude(delivery =>
                    delivery!.Photos)
            .AsSplitQuery()
            .SingleAsync(currentOrder =>
                currentOrder.Id == orderId);

        Assert.Equal(
            OrderStatus.Delivered,
            order.Status);

        Assert.Single(
            order.PreparationPhotos);

        Assert.NotNull(
            order.Delivery);

        Assert.Single(
            order.Delivery.Photos);

        Assert.True(
            order.Delivery.DeliveredAtUtc.HasValue);

        Assert.True(
            order.CompletedAtUtc.HasValue);

        Assert.True(
            order.DeleteAfterUtc.HasValue);

        Assert.Equal(
            order.Delivery.DeliveredAtUtc.Value,
            order.CompletedAtUtc.Value);

        Assert.Equal(
            order.Delivery.DeliveredAtUtc.Value.AddDays(40),
            order.DeleteAfterUtc.Value);

        var outboxMessages =
            await dbContext.TelegramOutboxMessages
                .AsNoTracking()
                .Include(message => message.Photos)
                .Where(message =>
                    message.RelatedEntityId == orderId)
                .ToListAsync();

        Assert.Contains(
            outboxMessages,
            message =>
                message.RelatedEntityType ==
                    TelegramRelatedEntityTypes.Order &&
                message.Channel ==
                    TelegramChannel.Orders);

        var preparationMessage =
            Assert.Single(
                outboxMessages.Where(message =>
                    message.RelatedEntityType ==
                        TelegramRelatedEntityTypes
                            .OrderPreparation));

        Assert.Equal(
            TelegramChannel.Orders,
            preparationMessage.Channel);

        Assert.Single(
            preparationMessage.Photos);

        var deliveryMessage =
            Assert.Single(
                outboxMessages.Where(message =>
                    message.RelatedEntityType ==
                        TelegramRelatedEntityTypes
                            .OrderDelivery));

        Assert.Equal(
            TelegramChannel.Delivery,
            deliveryMessage.Channel);

        Assert.Single(
            deliveryMessage.Photos);
    }

    private sealed record WorkflowTestData(
        string WorkerUsername,
        string DriverUsername,
        Guid CustomerId,
        Guid WarehouseId);
}   