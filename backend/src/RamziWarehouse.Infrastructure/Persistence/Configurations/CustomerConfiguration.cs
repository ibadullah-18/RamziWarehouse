using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RamziWarehouse.Domain.Entities;

namespace RamziWarehouse.Infrastructure.Persistence.Configurations;

public sealed class CustomerConfiguration
    : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.ToTable("Customers");

        builder.HasKey(customer => customer.Id);

        builder.Property(customer => customer.Name)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(customer => customer.PhoneNumber)
            .HasMaxLength(30);

        builder.Property(customer => customer.Note)
            .HasMaxLength(1000);

        builder.Property(customer => customer.IsActive)
            .HasDefaultValue(true);

        builder.HasIndex(customer => customer.Name);
    }
}