using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Configurations;

public sealed class UserConnectionConfiguration : IEntityTypeConfiguration<UserConnection>
{
    private readonly bool _isSqlite;

    public UserConnectionConfiguration(bool isSqlite)
    {
        _isSqlite = isSqlite;
    }

    public void Configure(EntityTypeBuilder<UserConnection> builder)
    {
        builder.ToTable("user_connections");
        builder.HasKey(c => c.Id);

        if (!_isSqlite)
        {
            builder.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()::text");
        }

        builder.Property(c => c.SellerId).IsRequired().HasMaxLength(100);
        builder.Property(c => c.ManufacturerId).IsRequired().HasMaxLength(100);
        builder.Property(c => c.ConnectedAt).IsRequired();

        builder.HasIndex(c => new { c.SellerId, c.ManufacturerId }).IsUnique();
    }
}
