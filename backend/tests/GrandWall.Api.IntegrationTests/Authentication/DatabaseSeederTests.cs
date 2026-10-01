using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace GrandWall.Api.IntegrationTests.Authentication;

public sealed class DatabaseSeederTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task RestartPreservesAdminChangesToExistingSeedAccount(bool deleted)
    {
        using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>
        {
            ["Seed:ManagerFullName"]="Initial manager",
            ["Seed:ManagerUsername"]="manager",
            ["Seed:ManagerPassword"]="InitialManager123!",
            ["Seed:AdminFullName"]="Initial admin",
            ["Seed:AdminUsername"]="admin",
            ["Seed:AdminPassword"]="InitialAdmin123!"
        }).Build();
        var hasher = new PasswordHasher<User>();
        var seeder = new DatabaseSeeder(db, hasher, configuration);
        await seeder.SeedAsync();
        var manager = await db.Users.SingleAsync(u=>u.Username=="manager");
        var id = manager.Id;
        manager.Role=UserRole.Accountant;
        manager.FullName="Changed name";
        manager.IsActive=!deleted;
        manager.IsDeleted=deleted;
        manager.PasswordHash=hasher.HashPassword(manager,"ChangedPassword123!");
        var hash=manager.PasswordHash;
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        await seeder.SeedAsync();
        await seeder.SeedAsync();
        manager = await db.Users.SingleAsync(u=>u.Username=="manager");
        Assert.Equal(id,manager.Id);
        Assert.Equal(UserRole.Accountant,manager.Role);
        Assert.Equal("Changed name",manager.FullName);
        Assert.Equal(hash,manager.PasswordHash);
        Assert.Equal(deleted,manager.IsDeleted);
        Assert.Equal(!deleted,manager.IsActive);
        Assert.Equal(2,await db.Users.CountAsync());
        Assert.Equal(3,await db.Warehouses.CountAsync());
        Assert.Equal(UserRole.Admin,(await db.Users.SingleAsync(u=>u.Username=="admin")).Role);
    }
}
