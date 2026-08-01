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
        await SeedWarehousesAsync(cancellationToken);
        await SeedManagerAsync(cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedWarehousesAsync(
        CancellationToken cancellationToken)
    {
        var existingNames = await _dbContext.Warehouses
            .Select(warehouse => warehouse.Name)
            .ToListAsync(cancellationToken);

        foreach (var warehouseName in WarehouseNames)
        {
            var exists = existingNames.Contains(
                warehouseName,
                StringComparer.OrdinalIgnoreCase);

            if (!exists)
            {
                _dbContext.Warehouses.Add(new Warehouse
                {
                    Name = warehouseName,
                    IsActive = true
                });
            }
        }
    }

    private async Task SeedManagerAsync(
        CancellationToken cancellationToken)
    {
        var fullName = _configuration["Seed:ManagerFullName"];
        var username = _configuration["Seed:ManagerUsername"];
        var password = _configuration["Seed:ManagerPassword"];

        if (string.IsNullOrWhiteSpace(fullName) ||
            string.IsNullOrWhiteSpace(username) ||
            string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException(
                "Initial manager settings are not configured.");
        }

        username = username.Trim();

        var managerExists = await _dbContext.Users
            .AnyAsync(
                user => user.Username == username,
                cancellationToken);

        if (managerExists)
        {
            return;
        }

        var manager = new User
        {
            FullName = fullName.Trim(),
            Username = username,
            Role = UserRole.Manager,
            IsActive = true
        };

        manager.PasswordHash = _passwordHasher.HashPassword(
            manager,
            password);

        _dbContext.Users.Add(manager);
    }
}