using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RamziWarehouse.Domain.Entities;

namespace RamziWarehouse.Infrastructure.Persistence.Configurations;

public sealed class OrderPreparationPhotoConfiguration
    : IEntityTypeConfiguration<OrderPreparationPhoto>
{
    public void Configure(
        EntityTypeBuilder<OrderPreparationPhoto> builder)
    {
        builder.ToTable(
            "OrderPreparationPhotos",
            table => table.HasCheckConstraint(
                "CK_OrderPreparationPhotos_FileSize_Positive",
                "[FileSizeBytes] > 0"));

        builder.HasKey(photo => photo.Id);

        builder.Property(photo => photo.CloudinaryPublicId)
            .HasMaxLength(255)
            .IsRequired();

        builder.HasIndex(photo => photo.CloudinaryPublicId)
            .IsUnique();

        builder.Property(photo => photo.OriginalFileName)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(photo => photo.ContentType)
            .HasMaxLength(100)
            .IsRequired();

        builder.HasIndex(photo => photo.OrderId);

        builder.HasOne(photo => photo.UploadedByUser)
            .WithMany()
            .HasForeignKey(photo => photo.UploadedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}