using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GrandWall.Domain.Entities;

namespace GrandWall.Infrastructure.Persistence.Configurations;

public sealed class CustomerAccountEntryConfiguration
    : IEntityTypeConfiguration<CustomerAccountEntry>
{
    public void Configure(
        EntityTypeBuilder<CustomerAccountEntry> builder)
    {
        builder.ToTable(
            "CustomerAccountEntries",
            table =>
            {
                table.HasCheckConstraint(
                    "CK_CustomerAccountEntries_Amount_Positive",
                    "[Amount] > 0");

                table.HasCheckConstraint(
                    "CK_CustomerAccountEntries_EntryType_Valid",
                    "[EntryType] IN (1, 2, 3, 4, 5)");
            });

        builder.HasKey(entry => entry.Id);

        builder.Property(entry => entry.EntryType)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(entry => entry.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(entry => entry.BusinessDate)
            .HasColumnType("date")
            .IsRequired();

        builder.Property(entry => entry.Note)
            .HasMaxLength(500);

        builder.Property(entry => entry.RecordedByFullName)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(entry => entry.RecordedByRole)
            .HasConversion<int>()
            .IsRequired();

        builder.HasIndex(entry => new
        {
            entry.CustomerId,
            entry.BusinessDate
        });

        builder.HasIndex(entry => new
        {
            entry.CustomerId,
            entry.CreatedAtUtc
        });

        builder.HasIndex(entry => new
        {
            entry.CustomerId,
            entry.BusinessDate,
            entry.EntryType
        })
        .IsUnique()
        .HasFilter("[EntryType] = 2");

        builder.HasIndex(entry => new
        {
            entry.CustomerId,
            entry.EntryType
        })
        .IsUnique()
        .HasFilter("[EntryType] = 1");

        builder.HasOne(entry => entry.Customer)
            .WithMany()
            .HasForeignKey(entry => entry.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(entry => entry.RecordedByUser)
            .WithMany()
            .HasForeignKey(entry => entry.RecordedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
