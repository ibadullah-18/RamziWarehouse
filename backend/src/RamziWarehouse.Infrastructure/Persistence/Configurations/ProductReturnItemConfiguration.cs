using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RamziWarehouse.Domain.Entities;

namespace RamziWarehouse.Infrastructure.Persistence.Configurations;

public sealed class ProductReturnItemConfiguration
    : IEntityTypeConfiguration<ProductReturnItem>
{
    public void Configure(EntityTypeBuilder<ProductReturnItem> builder)
    {
        builder.ToTable(
            "ProductReturnItems",
            table => table.HasCheckConstraint(
                "CK_ProductReturnItems_Quantity_Positive",
                "[Quantity] > 0"));

        builder.HasKey(item => item.Id);

        builder.Property(item => item.ProductCode)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(item => item.BatchNumber)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(item => item.Quantity)
            .IsRequired();

        builder.Property(item => item.ProductType)
            .HasConversion<int>();

        builder.HasIndex(item => new
        {
            item.ProductReturnId,
            item.ProductCode,
            item.BatchNumber
        });
    }
}