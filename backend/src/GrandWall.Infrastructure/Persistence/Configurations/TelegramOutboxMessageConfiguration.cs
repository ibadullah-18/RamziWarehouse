using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GrandWall.Infrastructure.Notifications.Telegram.Outbox;

namespace GrandWall.Infrastructure.Persistence.Configurations;

public sealed class TelegramOutboxMessageConfiguration
    : IEntityTypeConfiguration<TelegramOutboxMessage>
{
    public void Configure(
        EntityTypeBuilder<TelegramOutboxMessage> builder)
    {
        builder.ToTable("TelegramOutboxMessages");

        builder.HasKey(message => message.Id);

        builder.Property(message => message.Channel)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(message => message.Text)
            .HasMaxLength(4096)
            .IsRequired();

        builder.Property(message => message.Status)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(message => message.LastError)
            .HasMaxLength(2000);

        builder.Property(message => message.RelatedEntityType)
            .HasMaxLength(100);

        builder.Property(message => message.RowVersion)
            .IsRowVersion()
            .IsConcurrencyToken();

        builder.HasIndex(message => new
        {
            message.Status,
            message.NextAttemptAtUtc
        });

        builder.HasIndex(message => message.DeleteAfterUtc);

        builder.HasIndex(message => new
        {
            message.RelatedEntityType,
            message.RelatedEntityId
        });

        builder.HasMany(message => message.Photos)
            .WithOne(photo => photo.TelegramOutboxMessage)
            .HasForeignKey(photo => photo.TelegramOutboxMessageId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}