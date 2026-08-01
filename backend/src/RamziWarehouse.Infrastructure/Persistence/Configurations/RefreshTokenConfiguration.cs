using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RamziWarehouse.Domain.Entities;

namespace RamziWarehouse.Infrastructure.Persistence.Configurations;

public sealed class RefreshTokenConfiguration
    : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("RefreshTokens");

        builder.HasKey(token => token.Id);

        builder.Property(token => token.TokenHash)
            .HasMaxLength(128)
            .IsRequired();

        builder.HasIndex(token => token.TokenHash)
            .IsUnique();

        builder.Property(token => token.ExpiresAtUtc)
            .IsRequired();

        builder.Property(token => token.ReplacedByTokenHash)
            .HasMaxLength(128);

        builder.HasIndex(token => new
        {
            token.UserId,
            token.ExpiresAtUtc
        });

        builder.HasOne(token => token.User)
            .WithMany(user => user.RefreshTokens)
            .HasForeignKey(token => token.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}