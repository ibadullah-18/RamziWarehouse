using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RamziWarehouse.Application.Abstractions.Authentication;
using RamziWarehouse.Domain.Entities;
using RamziWarehouse.Infrastructure.Persistence;
using RamziWarehouse.Infrastructure.Security;
using RamziWarehouse.Infrastructure.Services;
using RamziWarehouse.Application.Abstractions.Users;
using RamziWarehouse.Application.Abstractions.Customers;
using RamziWarehouse.Application.Abstractions.Warehouses;
using RamziWarehouse.Application.Abstractions.Orders;
using RamziWarehouse.Application.Abstractions.Files;
using RamziWarehouse.Infrastructure.Storage.Cloudinary;

namespace RamziWarehouse.Infrastructure;

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
            options.UseSqlServer(connectionString);
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

        services.AddScoped<IWarehouseService, WarehouseService>();

        services.AddScoped<IOrderService, OrderService>();

        services.Configure<CloudinarySettings>(
            configuration.GetSection(CloudinarySettings.SectionName));

        services.AddScoped<IFileStorageService, CloudinaryFileStorageService>();

        services.AddScoped<
            IOrderPreparationService,
            OrderPreparationService>();

        return services;
    }
}