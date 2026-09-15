using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using GrandWall.Api.BackgroundServices;
using GrandWall.Api.IntegrationTests.Fakes;
using GrandWall.Application.Abstractions.Files;
using GrandWall.Infrastructure.Persistence;

namespace GrandWall.Api.IntegrationTests.Infrastructure;

public sealed class GrandWallApiFactory
    : WebApplicationFactory<Program>
{
    public const string ManagerUsername =
        "integration.manager";

    public const string ManagerPassword =
        "IntegrationTest123!";

    public const string AdminUsername =
        "integration.admin";

    public const string AdminPassword =
        "IntegrationAdmin123!";

    private readonly string _databaseName =
        $"GrandWallTests-{Guid.NewGuid():N}";

    static GrandWallApiFactory()
    {
        SetTestEnvironmentVariable(
            "ConnectionStrings__DefaultConnection",
            "Server=integration-tests;Database=test;");

        SetTestEnvironmentVariable(
            "Jwt__Issuer",
            "GrandWall.IntegrationTests");

        SetTestEnvironmentVariable(
            "Jwt__Audience",
            "GrandWall.IntegrationTests.Client");

        SetTestEnvironmentVariable(
            "Jwt__Key",
            "GrandWall-Integration-Tests-" +
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
            "Seed__AdminFullName",
            "Integration Test Admin");

        SetTestEnvironmentVariable(
            "Seed__AdminUsername",
            AdminUsername);

        SetTestEnvironmentVariable(
            "Seed__AdminPassword",
            AdminPassword);

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