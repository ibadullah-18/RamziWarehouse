using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GrandWall.Domain.Entities;

namespace GrandWall.Infrastructure.Persistence.Configurations;

public sealed class ProductReturnStatusHistoryConfiguration
    : IEntityTypeConfiguration<ProductReturnStatusHistory>
{
    public void Configure(
        EntityTypeBuilder<ProductReturnStatusHistory> builder)
    {
        builder.ToTable("ProductReturnStatusHistories");

        builder.HasKey(history => history.Id);

        builder.Property(history => history.PreviousStatus)
            .HasConversion<int?>();

        builder.Property(history => history.NewStatus)
            .HasConversion<int>();

        builder.Property(history => history.Note)
            .HasMaxLength(1000);

        builder.HasIndex(history => new
        {
            history.ProductReturnId,
            history.CreatedAtUtc
        });

        builder.HasOne(history => history.ChangedByUser)
            .WithMany()
            .HasForeignKey(history => history.ChangedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}