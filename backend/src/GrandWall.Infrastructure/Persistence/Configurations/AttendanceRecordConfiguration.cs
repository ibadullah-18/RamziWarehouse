using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GrandWall.Domain.Entities;

namespace GrandWall.Infrastructure.Persistence.Configurations;

public sealed class AttendanceRecordConfiguration
    : IEntityTypeConfiguration<AttendanceRecord>
{
    public void Configure(EntityTypeBuilder<AttendanceRecord> builder)
    {
        builder.ToTable(
            "AttendanceRecords",
            table => table.HasCheckConstraint(
                "CK_AttendanceRecords_CheckOutAfterCheckIn",
                "[CheckedOutAtUtc] IS NULL OR " +
                "[CheckedOutAtUtc] > [CheckedInAtUtc]"));

        builder.HasKey(record => record.Id);

        builder.Property(record => record.WorkDate)
            .HasColumnType("date")
            .IsRequired();

        builder.Property(record => record.CheckedInAtUtc)
            .IsRequired();

        builder.HasIndex(record => new
        {
            record.UserId,
            record.WorkDate
        }).IsUnique();

        builder.HasIndex(record => record.DeleteAfterUtc);

        builder.HasOne(record => record.User)
            .WithMany()
            .HasForeignKey(record => record.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}