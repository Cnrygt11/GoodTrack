using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Configurations;

public sealed class EtsyConnectionConfiguration : IEntityTypeConfiguration<EtsyConnection>
{
    private readonly bool _isSqlite;

    public EtsyConnectionConfiguration(bool isSqlite)
    {
        _isSqlite = isSqlite;
    }

    public void Configure(EntityTypeBuilder<EtsyConnection> builder)
    {
        builder.ToTable("etsy_connections");
        builder.HasKey(e => new { e.UserId, e.EtsyShopId });

        builder.Property(e => e.UserId).HasMaxLength(100);
        builder.Property(e => e.EtsyShopId).HasMaxLength(100);
        builder.Property(e => e.EtsyShopName).IsRequired().HasMaxLength(200);
        builder.Property(e => e.ApiKeyKeystring).IsRequired().HasMaxLength(200);
        builder.Property(e => e.ApiKeySharedSecret).IsRequired().HasMaxLength(200);
        builder.Property(e => e.AccessToken).IsRequired().HasMaxLength(1000);
        builder.Property(e => e.RefreshToken).IsRequired().HasMaxLength(1000);
        builder.Property(e => e.TokenExpiresAt).IsRequired();
        builder.Property(e => e.WebhookSigningSecret).HasMaxLength(200);
        builder.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);

        builder.HasOne<User>()
              .WithMany()
              .HasForeignKey(e => e.UserId)
              .OnDelete(DeleteBehavior.Cascade);
    }
}
