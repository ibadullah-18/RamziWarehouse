using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RamziWarehouse.Domain.Entities;
using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Infrastructure.Persistence;

public sealed class DatabaseSeeder
{
    private static readonly string[] WarehouseNames =
    [
        "Əsas anbar",
        "Kainat",
        "Yevrahome"
    ];

    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IConfiguration _configuration;

    public DatabaseSeeder(
        AppDbContext dbContext,
        IPasswordHasher<User> passwordHasher,
        IConfiguration configuration)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _configuration = configuration;
    }

    public async Task SeedAsync(
        CancellationToken cancellationToken = default)
    {
        await SeedWarehousesAsync(
            cancellationToken);

        await SeedConfiguredUserAsync(
            configurationName: "Manager",
            role: UserRole.Manager,
            cancellationToken);

        await SeedConfiguredUserAsync(
            configurationName: "Admin",
            role: UserRole.Admin,
            cancellationToken);

        await _dbContext.SaveChangesAsync(
            cancellationToken);
    }

    private async Task SeedWarehousesAsync(
        CancellationToken cancellationToken)
    {
        var existingNames =
            await _dbContext.Warehouses
                .Select(warehouse => warehouse.Name)
                .ToListAsync(cancellationToken);

        foreach (
            var warehouseName in WarehouseNames)
        {
            var exists = existingNames.Contains(
                warehouseName,
                StringComparer.OrdinalIgnoreCase);

            if (exists)
            {
                continue;
            }

            _dbContext.Warehouses.Add(
                new Warehouse
                {
                    Name = warehouseName,
                    IsActive = true
                });
        }
    }

    private async Task SeedConfiguredUserAsync(
        string configurationName,
        UserRole role,
        CancellationToken cancellationToken)
    {
        var configurationPrefix =
            $"Seed:{configurationName}";

        var fullName =
            _configuration[
                $"{configurationPrefix}FullName"];

        var username =
            _configuration[
                $"{configurationPrefix}Username"];

        var password =
            _configuration[
                $"{configurationPrefix}Password"];

        if (string.IsNullOrWhiteSpace(fullName) ||
            string.IsNullOrWhiteSpace(username) ||
            string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException(
                $"{configurationName} seed settings " +
                "are not configured.");
        }

        var normalizedUsername =
            username
                .Trim()
                .ToLowerInvariant();

        var existingUser =
            await _dbContext.Users
                .SingleOrDefaultAsync(
                    user =>
                        user.Username ==
                        normalizedUsername,
                    cancellationToken);

        if (existingUser is not null)
        {
            if (existingUser.Role != role)
            {
                throw new InvalidOperationException(
                    $"The seed username " +
                    $"'{normalizedUsername}' already " +
                    "belongs to a different role.");
            }

            return;
        }

        var user = new User
        {
            FullName = fullName.Trim(),
            Username = normalizedUsername,
            Role = role,
            IsActive = true
        };

        user.PasswordHash =
            _passwordHasher.HashPassword(
                user,
                password);

        _dbContext.Users.Add(user);
    }
}