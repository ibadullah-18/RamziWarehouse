using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RamziWarehouse.Domain.Entities;

namespace RamziWarehouse.Infrastructure.Persistence.Configurations;

public sealed class ProductReturnConfiguration
    : IEntityTypeConfiguration<ProductReturn>
{
    public void Configure(EntityTypeBuilder<ProductReturn> builder)
    {
        builder.ToTable("ProductReturns");

        builder.HasKey(productReturn => productReturn.Id);

        builder.Property(productReturn => productReturn.ReturnDateUtc)
            .IsRequired();

        builder.Property(productReturn => productReturn.AdditionalNote)
            .HasMaxLength(1000);

        builder.Property(productReturn => productReturn.Status)
            .HasConversion<int>();

        builder.HasIndex(productReturn => productReturn.ReturnDateUtc);

        builder.HasIndex(productReturn => productReturn.Status);

        builder.HasIndex(productReturn => productReturn.DeleteAfterUtc);

        builder.HasOne(productReturn => productReturn.Customer)
            .WithMany()
            .HasForeignKey(productReturn => productReturn.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(productReturn => productReturn.Warehouse)
            .WithMany()
            .HasForeignKey(productReturn => productReturn.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(productReturn => productReturn.CreatedByUser)
            .WithMany()
            .HasForeignKey(productReturn => productReturn.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(productReturn => productReturn.ProcessedByUser)
            .WithMany()
            .HasForeignKey(productReturn => productReturn.ProcessedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(productReturn => productReturn.Items)
            .WithOne(item => item.ProductReturn)
            .HasForeignKey(item => item.ProductReturnId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(productReturn => productReturn.Photos)
            .WithOne(photo => photo.ProductReturn)
            .HasForeignKey(photo => photo.ProductReturnId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(productReturn => productReturn.StatusHistory)
            .WithOne(history => history.ProductReturn)
            .HasForeignKey(history => history.ProductReturnId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}