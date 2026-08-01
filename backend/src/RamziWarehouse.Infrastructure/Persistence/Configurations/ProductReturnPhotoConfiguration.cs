using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RamziWarehouse.Domain.Entities;

namespace RamziWarehouse.Infrastructure.Persistence.Configurations;

public sealed class ProductReturnPhotoConfiguration
    : IEntityTypeConfiguration<ProductReturnPhoto>
{
    public void Configure(
        EntityTypeBuilder<ProductReturnPhoto> builder)
    {
        builder.ToTable(
            "ProductReturnPhotos",
            table => table.HasCheckConstraint(
                "CK_ProductReturnPhotos_FileSize_Positive",
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

        builder.HasIndex(photo => photo.ProductReturnId);

        builder.HasOne(photo => photo.UploadedByUser)
            .WithMany()
            .HasForeignKey(photo => photo.UploadedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}