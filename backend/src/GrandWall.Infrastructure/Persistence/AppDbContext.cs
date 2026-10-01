using Microsoft.EntityFrameworkCore;
using GrandWall.Domain.Common;
using GrandWall.Domain.Entities;
using GrandWall.Infrastructure.Notifications.Telegram.Outbox;

namespace GrandWall.Infrastructure.Persistence;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }
        
    public DbSet<AccountDayClosure> AccountDayClosures => Set<AccountDayClosure>();

    public DbSet<PushDevice> PushDevices => Set<PushDevice>();
    public DbSet<PushDelivery> PushDeliveries => Set<PushDelivery>();

    public DbSet<User> Users => Set<User>();

    public DbSet<AttendanceRecord> AttendanceRecords =>
    Set<AttendanceRecord>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<Warehouse> Warehouses => Set<Warehouse>();

    public DbSet<Customer> Customers => Set<Customer>();

    public DbSet<CustomerAccountEntry> CustomerAccountEntries =>
        Set<CustomerAccountEntry>();

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
        modelBuilder.Entity<AccountDayClosure>().HasKey(x => x.BusinessDate);
        modelBuilder.Entity<AccountDayClosure>().Property(x => x.RecordedByFullName).HasMaxLength(150);

        modelBuilder.Entity<PushDevice>().HasKey(x=>x.Token);
        modelBuilder.Entity<PushDevice>().Property(x=>x.Token).HasMaxLength(200);
        modelBuilder.Entity<PushDelivery>().Property(x=>x.Token).HasMaxLength(200);
        modelBuilder.Entity<PushDelivery>().Property(x=>x.Body).HasMaxLength(500);
        modelBuilder.Entity<PushDelivery>().Property(x=>x.TicketId).HasMaxLength(200);
        modelBuilder.Entity<PushDelivery>().HasIndex(x=>new{x.Completed,x.NextAttemptUtc});
        modelBuilder.Entity<PushDelivery>().HasIndex(x=>new{x.ProductReturnId,x.Token}).IsUnique();
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
        foreach (var entry in ChangeTracker.Entries<ProductReturn>())
            if (entry.State == EntityState.Modified) entry.Entity.Revision = Guid.NewGuid();

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