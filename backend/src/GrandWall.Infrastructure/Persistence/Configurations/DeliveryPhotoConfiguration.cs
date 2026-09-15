using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GrandWall.Domain.Entities;

namespace GrandWall.Infrastructure.Persistence.Configurations;

public sealed class DeliveryPhotoConfiguration
    : IEntityTypeConfiguration<DeliveryPhoto>
{
    public void Configure(EntityTypeBuilder<DeliveryPhoto> builder)
    {
        builder.ToTable(
            "DeliveryPhotos",
            table => table.HasCheckConstraint(
                "CK_DeliveryPhotos_FileSize_Positive",
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

        builder.HasIndex(photo => photo.OrderDeliveryId);

        builder.HasOne(photo => photo.UploadedByUser)
            .WithMany()
            .HasForeignKey(photo => photo.UploadedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}