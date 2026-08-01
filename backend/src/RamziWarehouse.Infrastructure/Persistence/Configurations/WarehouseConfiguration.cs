using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RamziWarehouse.Domain.Entities;

namespace RamziWarehouse.Infrastructure.Persistence.Configurations;

public sealed class WarehouseConfiguration
    : IEntityTypeConfiguration<Warehouse>
{
    public void Configure(EntityTypeBuilder<Warehouse> builder)
    {
        builder.ToTable("Warehouses");

        builder.HasKey(warehouse => warehouse.Id);

        builder.Property(warehouse => warehouse.Name)
            .HasMaxLength(100)
            .IsRequired();

        builder.HasIndex(warehouse => warehouse.Name)
            .IsUnique();

        builder.Property(warehouse => warehouse.IsActive)
            .HasDefaultValue(true);
    }
}