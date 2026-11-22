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
        
    public DbSet<AccountEntryAudit> AccountEntryAudits => Set<AccountEntryAudit>();
    public DbSet<ReturnPerson> ReturnPersons => Set<ReturnPerson>();
    public DbSet<CustomerPriceRule> CustomerPriceRules => Set<CustomerPriceRule>();
    public DbSet<ReturnCodeRule> ReturnCodeRules => Set<ReturnCodeRule>();
    public DbSet<AccountSettlement> AccountSettlements => Set<AccountSettlement>();
    public DbSet<AccountDay> AccountDays => Set<AccountDay>();

    public DbSet<PushDevice> PushDevices => Set<PushDevice>();
    public DbSet<PushDelivery> PushDeliveries => Set<PushDelivery>();
    public DbSet<WebPushSubscription> WebPushSubscriptions => Set<WebPushSubscription>();
    public DbSet<AppBranding> AppBranding => Set<AppBranding>();
    public DbSet<Handover> Handovers => Set<Handover>();
    public DbSet<HandoverPhoto> HandoverPhotos => Set<HandoverPhoto>();

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

    /// <summary>
    /// Every DateTime is stored in UTC. SQL Server's datetime2 forgets that, so values read back
    /// were "unspecified" and went to the app without the "Z" — phones then showed every time
    /// 4 hours early (read as Baku time). Mark them UTC on the way out of the database.
    /// </summary>
    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        configurationBuilder.Properties<DateTime?>().HaveConversion<NullableUtcDateTimeConverter>();
    }

    private sealed class UtcDateTimeConverter()
        : Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime, DateTime>(
            value => value.Kind == DateTimeKind.Local ? value.ToUniversalTime() : value,
            value => DateTime.SpecifyKind(value, DateTimeKind.Utc));

    private sealed class NullableUtcDateTimeConverter()
        : Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime?, DateTime?>(
            value => value.HasValue && value.Value.Kind == DateTimeKind.Local ? value.Value.ToUniversalTime() : value,
            value => value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : value);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<ReturnPerson>().Property(x=>x.Name).HasMaxLength(150);
        modelBuilder.Entity<ReturnCodeRule>().Property(x => x.Id).ValueGeneratedNever();
        modelBuilder.Entity<CustomerPriceRule>().Property(x => x.CodePrefix).HasMaxLength(10);
        modelBuilder.Entity<CustomerPriceRule>().Property(x => x.Price).HasPrecision(18, 2);
        modelBuilder.Entity<CustomerPriceRule>().HasIndex(x => new { x.CustomerId, x.CodePrefix }).IsUnique();
        modelBuilder.Entity<CustomerPriceRule>().HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<AccountSettlement>().Property(x=>x.Cash).HasPrecision(18,2);
        modelBuilder.Entity<AccountSettlement>().Property(x=>x.Card).HasPrecision(18,2);
        modelBuilder.Entity<AccountSettlement>().Property(x=>x.Bonus).HasPrecision(18,2);
        modelBuilder.Entity<AccountSettlement>().Property(x => x.PayoutCash).HasPrecision(18, 2);
        modelBuilder.Entity<AccountSettlement>().Property(x => x.PayoutCard).HasPrecision(18, 2);
        modelBuilder.Entity<AccountSettlement>().Property(x=>x.Note).HasMaxLength(400);
        modelBuilder.Entity<AccountSettlement>().HasIndex(x=>x.CustomerId);
        modelBuilder.Entity<ProductReturn>().Property(x=>x.Amount).HasPrecision(18,2);
        modelBuilder.Entity<ProductReturn>().Property(x=>x.AppliedAmount).HasPrecision(18,2);
        modelBuilder.Entity<ProductReturn>().Property(x=>x.ReturnPersonName).HasMaxLength(150);
        modelBuilder.Entity<AccountEntryAudit>().Property(x=>x.UserName).HasMaxLength(150);
        modelBuilder.Entity<AccountEntryAudit>().Property(x=>x.Description).HasMaxLength(1000);
        modelBuilder.Entity<AccountEntryAudit>().HasIndex(x=>x.CustomerId);
        modelBuilder.Entity<AccountDay>().HasKey(x => x.BusinessDate);
        modelBuilder.Entity<AccountDay>().Property(x => x.BusinessDate).HasColumnType("date");
        modelBuilder.Entity<AccountDay>().Property(x => x.StartedByFullName).HasMaxLength(150);
        modelBuilder.Entity<AccountDay>().Property(x => x.ClosedByFullName).HasMaxLength(150);
        modelBuilder.Entity<AccountSettlement>().Property(x => x.ReturnsKey).HasMaxLength(2500);

        modelBuilder.Entity<PushDevice>().HasKey(x=>x.Token);
        modelBuilder.Entity<WebPushSubscription>().Property(x => x.Endpoint).HasMaxLength(800);
        modelBuilder.Entity<WebPushSubscription>().Property(x => x.P256dh).HasMaxLength(200);
        modelBuilder.Entity<WebPushSubscription>().Property(x => x.Auth).HasMaxLength(100);
        modelBuilder.Entity<WebPushSubscription>().HasIndex(x => x.Endpoint).IsUnique();
        modelBuilder.Entity<WebPushSubscription>().HasIndex(x => x.UserId);
        modelBuilder.Entity<Handover>().Property(x => x.CustomerName).HasMaxLength(200);
        modelBuilder.Entity<Handover>().Property(x => x.CreatedByFullName).HasMaxLength(200);
        modelBuilder.Entity<Handover>().Property(x => x.Note).HasMaxLength(Handover.MaxNoteLength);
        modelBuilder.Entity<Handover>().HasIndex(x => x.OperationId).IsUnique();
        modelBuilder.Entity<Handover>().HasIndex(x => new { x.BusinessDate, x.IsDeleted });
        modelBuilder.Entity<Handover>().HasIndex(x => new { x.CreatedByUserId, x.BusinessDate });
        modelBuilder.Entity<Handover>().HasMany(x => x.Photos).WithOne().HasForeignKey(x => x.HandoverId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<HandoverPhoto>().Property(x => x.StoragePublicId).HasMaxLength(500);
        modelBuilder.Entity<HandoverPhoto>().Property(x => x.ContentType).HasMaxLength(100);
        modelBuilder.Entity<AppBranding>().ToTable("AppBranding");
        modelBuilder.Entity<AppBranding>().Property(x => x.Id).ValueGeneratedNever();
        modelBuilder.Entity<AppBranding>().Property(x => x.AppName).HasMaxLength(40);
        modelBuilder.Entity<AppBranding>().Property(x => x.LogoContentType).HasMaxLength(40);
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
