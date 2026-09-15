using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GrandWall.Domain.Entities;

namespace GrandWall.Infrastructure.Persistence.Configurations;

public sealed class OrderDeliveryConfiguration
    : IEntityTypeConfiguration<OrderDelivery>
{
    public void Configure(
        EntityTypeBuilder<OrderDelivery> builder)
    {
        builder.ToTable(
            "OrderDeliveries",
            table => table.HasCheckConstraint(
                "CK_OrderDeliveries_DeliveryTime",
                "[DeliveredAtUtc] IS NULL OR " +
                "[DeliveredAtUtc] >= [StartedAtUtc]"));

        builder.HasKey(delivery => delivery.Id);

        builder.HasIndex(delivery => delivery.OrderId)
            .IsUnique();

        builder.Property(delivery => delivery.StartedAtUtc)
            .HasDefaultValueSql("SYSUTCDATETIME()")
            .IsRequired();

        builder.Property(delivery => delivery.DeliveredAtUtc);

        builder.Property(delivery => delivery.Note)
            .HasMaxLength(1000);

        builder.HasIndex(delivery => delivery.StartedAtUtc);

        builder.HasIndex(delivery => delivery.DeliveredAtUtc);

        builder.HasOne(delivery => delivery.DeliveredByUser)
            .WithMany()
            .HasForeignKey(delivery =>
                delivery.DeliveredByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(delivery => delivery.Photos)
            .WithOne(photo => photo.OrderDelivery)
            .HasForeignKey(photo =>
                photo.OrderDeliveryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}