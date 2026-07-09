using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    private readonly bool _isSqlite;

    public UserConfiguration(bool isSqlite)
    {
        _isSqlite = isSqlite;
    }

    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");
        builder.HasKey(u => u.Id);

        if (!_isSqlite)
        {
            builder.Property(u => u.Id).HasDefaultValueSql("gen_random_uuid()::text");
        }
        
        builder.Property(u => u.Username).IsRequired().HasMaxLength(100);
        builder.Property(u => u.PasswordHash).IsRequired();
        builder.Property(u => u.Role).IsRequired().HasMaxLength(20);
        builder.Property(u => u.Email).HasMaxLength(200);
        builder.Property(u => u.FirstName).HasMaxLength(100);
        builder.Property(u => u.LastName).HasMaxLength(100);
        builder.Property(u => u.PhoneNumber).HasMaxLength(20);
        builder.Property(u => u.City).HasMaxLength(100);
        builder.Property(u => u.Bio).HasMaxLength(1000);
        builder.Property(u => u.CreatedAt).HasMaxLength(50);
        builder.Property(u => u.VerificationToken).HasMaxLength(200);
        builder.Property(u => u.VerificationTokenExpiresAt).HasMaxLength(50);
        builder.Property(u => u.RefreshToken).HasMaxLength(500);

        if (!_isSqlite)
        {
            builder.Property(u => u.Keywords).HasColumnType("text[]");
            builder.Property(u => u.ProductImages).HasColumnType("text[]");
            builder.Property(u => u.RowVersion).IsRowVersion();
        }

        builder.HasIndex(u => u.Username).IsUnique();
        builder.HasIndex(u => u.Email).IsUnique();
    }
}
