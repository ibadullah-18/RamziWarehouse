using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GrandWall.Domain.Entities;

namespace GrandWall.Infrastructure.Persistence.Configurations;

public sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("Orders");

        builder.HasKey(order => order.Id);

        builder.Property(order => order.OrderNumber)
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(order => order.OrderNumber)
            .IsUnique();

        builder.Property(order => order.AdditionalNote)
            .HasMaxLength(1000);

        builder.Property(order => order.Status)
            .HasConversion<int>();

        builder.HasIndex(order => order.OrderDateUtc);

        builder.HasIndex(order => order.Status);

        builder.HasIndex(order => order.DeleteAfterUtc);

        builder.HasOne(order => order.Customer)
            .WithMany()
            .HasForeignKey(order => order.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(order => order.Warehouse)
            .WithMany()
            .HasForeignKey(order => order.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(order => order.CreatedByUser)
            .WithMany()
            .HasForeignKey(order => order.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(order => order.PreparedByUser)
            .WithMany()
            .HasForeignKey(order => order.PreparedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(order => order.Items)
            .WithOne(item => item.Order)
            .HasForeignKey(item => item.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(order => order.PreparationPhotos)
            .WithOne(photo => photo.Order)
            .HasForeignKey(photo => photo.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(order => order.Delivery)
            .WithOne(delivery => delivery.Order)
            .HasForeignKey<OrderDelivery>(delivery => delivery.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(order => order.StatusHistory)
            .WithOne(history => history.Order)
            .HasForeignKey(history => history.OrderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}