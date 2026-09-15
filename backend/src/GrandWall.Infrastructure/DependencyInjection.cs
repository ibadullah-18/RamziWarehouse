using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using GrandWall.Application.Abstractions.Attendance;
using GrandWall.Application.Abstractions.Authentication;
using GrandWall.Application.Abstractions.Customers;
using GrandWall.Application.Abstractions.Dashboard;
using GrandWall.Application.Abstractions.Files;
using GrandWall.Application.Abstractions.Notifications;
using GrandWall.Application.Abstractions.Orders;
using GrandWall.Application.Abstractions.ProductReturns;
using GrandWall.Application.Abstractions.Retention;
using GrandWall.Application.Abstractions.Users;
using GrandWall.Application.Abstractions.Warehouses;
using GrandWall.Domain.Entities;
using GrandWall.Infrastructure.Notifications.Telegram;
using GrandWall.Infrastructure.Notifications.Telegram.Outbox;
using GrandWall.Infrastructure.Persistence;
using GrandWall.Infrastructure.Security;
using GrandWall.Infrastructure.Services;
using GrandWall.Infrastructure.Storage.Cloudinary;

namespace GrandWall.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString(
            "DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "DefaultConnection is not configured.");
        }

        services.AddDbContext<AppDbContext>(options =>
        {
            options.UseSqlServer(
                connectionString,
                sqlServerOptions =>
                {
                    sqlServerOptions.EnableRetryOnFailure(
                        maxRetryCount: 5,
                        maxRetryDelay: TimeSpan.FromSeconds(10),
                        errorNumbersToAdd: null);
                });
        });

        services.AddScoped<DatabaseSeeder>();

        services.Configure<JwtSettings>(
            configuration.GetSection(JwtSettings.SectionName));

        services.AddSingleton(TimeProvider.System);

        services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();

        services.AddScoped<ITokenService, TokenService>();

        services.AddScoped<IAuthService, AuthService>();

        services.AddScoped<IUserService, UserService>();

        services.AddScoped<ICustomerService, CustomerService>();

        services.AddScoped<
            GrandWall.Application.Abstractions.CustomerAccounts.ICustomerAccountService,
            CustomerAccountService>();

        services.AddScoped<IWarehouseService, WarehouseService>();

        services.AddScoped<IDashboardService, DashboardService>();

        services.AddScoped<IOrderService, OrderService>();

        services.Configure<CloudinarySettings>(
            configuration.GetSection(CloudinarySettings.SectionName));

        services.AddScoped<IFileStorageService, CloudinaryFileStorageService>();

        services.AddScoped<
            IOrderPreparationService,
            OrderPreparationService>();

        services.AddScoped<IProductReturnService, ProductReturnService>();

        services.AddScoped<
            IAttendanceService,
            AttendanceService>();

        services.AddScoped<
            IProductReturnSubmissionService,
            ProductReturnSubmissionService>();

        services.AddScoped<
            IProductReturnPhotoService,
            ProductReturnPhotoService>();

        services.AddScoped<
            IOrderPhotoFileService,
            OrderPhotoFileService>();

        services.AddScoped<
            IOrderReceiptService,
            OrderReceiptService>();

        services.AddScoped<
            IDataRetentionCleanupService,
            DataRetentionCleanupService>();

        services.AddScoped<
            GrandWall.Application.Abstractions.CustomerAccounts.ICustomerAccountRetentionService,
            CustomerAccountRetentionService>();

        services.Configure<TelegramSettings>(
            configuration.GetSection(
                TelegramSettings.SectionName));

        services.AddScoped<
            ITelegramOutboxService,
            TelegramOutboxService>();

        services.AddScoped<
            ITelegramOutboxProcessor,
            TelegramOutboxProcessor>();

        services.AddScoped<
            IOrderDeliveryService,
            OrderDeliveryService>();

        services
            .AddHttpClient<
                ITelegramNotificationService,
                TelegramNotificationService>(client =>
                {
                    client.BaseAddress =
                        new Uri("https://api.telegram.org/");

                    client.Timeout =
                        TimeSpan.FromSeconds(20);
                })
            .RemoveAllLoggers();

        return services;
    }
}