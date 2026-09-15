using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GrandWall.Infrastructure.Notifications.Telegram.Outbox;

namespace GrandWall.Infrastructure.Persistence.Configurations;

public sealed class TelegramOutboxPhotoConfiguration
    : IEntityTypeConfiguration<TelegramOutboxPhoto>
{
    public void Configure(
        EntityTypeBuilder<TelegramOutboxPhoto> builder)
    {
        builder.ToTable("TelegramOutboxPhotos");

        builder.HasKey(photo => photo.Id);

        builder.Property(photo => photo.CloudinaryPublicId)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(photo => photo.OriginalFileName)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(photo => photo.ContentType)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(photo => photo.SortOrder)
            .IsRequired();

        builder.HasIndex(photo => new
        {
            photo.TelegramOutboxMessageId,
            photo.SortOrder
        });
    }
}