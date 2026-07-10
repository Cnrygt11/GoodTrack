using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Configurations;

public sealed class EtsyOAuthStateConfiguration : IEntityTypeConfiguration<EtsyOAuthState>
{
    public void Configure(EntityTypeBuilder<EtsyOAuthState> builder)
    {
        builder.ToTable("etsy_oauth_states");
        builder.HasKey(s => s.State);

        builder.Property(s => s.State).HasMaxLength(64);
        builder.Property(s => s.UserId).IsRequired().HasMaxLength(100);
        builder.Property(s => s.CodeVerifier).IsRequired().HasMaxLength(200);
        builder.Property(s => s.CallbackUrl).IsRequired().HasMaxLength(500);
        builder.Property(s => s.FrontendUrl).IsRequired().HasMaxLength(500);
        builder.Property(s => s.CreatedAt).IsRequired();
        builder.Property(s => s.ExpiresAt).IsRequired();

        // Süresi dolmuş kayıtların toplu temizliği için
        builder.HasIndex(s => s.ExpiresAt);

        builder.HasOne<User>()
              .WithMany()
              .HasForeignKey(s => s.UserId)
              .OnDelete(DeleteBehavior.Cascade);
    }
}
