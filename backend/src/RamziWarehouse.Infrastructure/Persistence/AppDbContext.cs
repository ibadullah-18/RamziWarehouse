using Microsoft.EntityFrameworkCore;
using RamziWarehouse.Domain.Common;
using RamziWarehouse.Domain.Entities;
using RamziWarehouse.Infrastructure.Notifications.Telegram.Outbox;

namespace RamziWarehouse.Infrastructure.Persistence;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }
        
    public DbSet<User> Users => Set<User>();

    public DbSet<AttendanceRecord> AttendanceRecords =>
    Set<AttendanceRecord>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<Warehouse> Warehouses => Set<Warehouse>();

    public DbSet<Customer> Customers => Set<Customer>();

    public DbSet<Order> Orders => Set<Order>();

    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    public DbSet<OrderPreparationPhoto> OrderPreparationPhotos =>
        Set<OrderPreparationPhoto>();

    public DbSet<OrderDelivery> OrderDeliveries => Set<OrderDelivery>();

    public DbSet<DeliveryPhoto> DeliveryPhotos => Set<DeliveryPhoto>();

    public DbSet<OrderStatusHistory> OrderStatusHistories =>
        Set<OrderStatusHistory>();

    public DbSet<ProductReturn> ProductReturns => Set<ProductReturn>();

    public DbSet<ProductReturnItem> ProductReturnItems =>
        Set<ProductReturnItem>();

    public DbSet<ProductReturnPhoto> ProductReturnPhotos =>
        Set<ProductReturnPhoto>();

    public DbSet<ProductReturnStatusHistory> ProductReturnStatusHistories =>
        Set<ProductReturnStatusHistory>();

    public DbSet<TelegramOutboxMessage> TelegramOutboxMessages =>
        Set<TelegramOutboxMessage>();

    public DbSet<TelegramOutboxPhoto> TelegramOutboxPhotos =>
        Set<TelegramOutboxPhoto>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(
            typeof(AppDbContext).Assembly);
    }

    public override int SaveChanges()
    {
        UpdateAuditFields();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        UpdateAuditFields();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void UpdateAuditFields()
    {
        var utcNow = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAtUtc = utcNow;
            }

            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAtUtc = utcNow;
            }
        }
    }
}