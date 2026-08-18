using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using RamziWarehouse.Api.BackgroundServices;
using RamziWarehouse.Api.IntegrationTests.Fakes;
using RamziWarehouse.Application.Abstractions.Files;
using RamziWarehouse.Infrastructure.Persistence;

namespace RamziWarehouse.Api.IntegrationTests.Infrastructure;

public sealed class RamziWarehouseApiFactory
    : WebApplicationFactory<Program>
{
    public const string ManagerUsername =
        "integration.manager";

    public const string ManagerPassword =
        "IntegrationTest123!";

    private readonly string _databaseName =
        $"RamziWarehouseTests-{Guid.NewGuid():N}";

    static RamziWarehouseApiFactory()
    {
        SetTestEnvironmentVariable(
            "ConnectionStrings__DefaultConnection",
            "Server=integration-tests;Database=test;");

        SetTestEnvironmentVariable(
            "Jwt__Issuer",
            "RamziWarehouse.IntegrationTests");

        SetTestEnvironmentVariable(
            "Jwt__Audience",
            "RamziWarehouse.IntegrationTests.Client");

        SetTestEnvironmentVariable(
            "Jwt__Key",
            "RamziWarehouse-Integration-Tests-" +
            "Signing-Key-2026-Long-And-Secure!");

        SetTestEnvironmentVariable(
            "Jwt__AccessTokenMinutes",
            "15");

        SetTestEnvironmentVariable(
            "Jwt__RefreshTokenDays",
            "30");

        SetTestEnvironmentVariable(
            "Seed__ManagerFullName",
            "Integration Test Manager");

        SetTestEnvironmentVariable(
            "Seed__ManagerUsername",
            ManagerUsername);

        SetTestEnvironmentVariable(
            "Seed__ManagerPassword",
            ManagerPassword);

        SetTestEnvironmentVariable(
            "Telegram__Enabled",
            "false");

        SetTestEnvironmentVariable(
            "Cloudinary__CloudName",
            "integration-tests");

        SetTestEnvironmentVariable(
            "Cloudinary__ApiKey",
            "integration-tests");

        SetTestEnvironmentVariable(
            "Cloudinary__ApiSecret",
            "integration-tests");
    }

    protected override void ConfigureWebHost(
        IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<
                DbContextOptions<AppDbContext>>();

            services.RemoveAll<
                IDbContextOptionsConfiguration<AppDbContext>>();

            services.RemoveAll<AppDbContext>();

            RemoveBackgroundService<
                DataRetentionBackgroundService>(services);

            RemoveBackgroundService<
                TelegramOutboxBackgroundService>(services);

            services.AddDbContext<AppDbContext>(
                options =>
                {
                    options.UseInMemoryDatabase(
                        _databaseName);
                });

            services.RemoveAll<IFileStorageService>();

            services.AddSingleton<
                IFileStorageService,
                FakeFileStorageService>();
        });
    }

    private static void SetTestEnvironmentVariable(
        string name,
        string value)
    {
        Environment.SetEnvironmentVariable(
            name,
            value,
            EnvironmentVariableTarget.Process);
    }

    private static void RemoveBackgroundService<
        TBackgroundService>(
            IServiceCollection services)
        where TBackgroundService : class, IHostedService
    {
        var descriptors = services
            .Where(descriptor =>
                descriptor.ServiceType ==
                    typeof(IHostedService) &&
                descriptor.ImplementationType ==
                    typeof(TBackgroundService))
            .ToList();

        foreach (var descriptor in descriptors)
        {
            services.Remove(descriptor);
        }
    }
}