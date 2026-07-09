using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Configurations;

public sealed class ConnectionRequestConfiguration : IEntityTypeConfiguration<ConnectionRequest>
{
    private readonly bool _isSqlite;

    public ConnectionRequestConfiguration(bool isSqlite)
    {
        _isSqlite = isSqlite;
    }

    public void Configure(EntityTypeBuilder<ConnectionRequest> builder)
    {
        builder.ToTable("connection_requests");
        builder.HasKey(r => r.Id);

        if (!_isSqlite)
        {
            builder.Property(r => r.Id).HasDefaultValueSql("gen_random_uuid()::text");
        }

        builder.Property(r => r.SenderId).IsRequired().HasMaxLength(100);
        builder.Property(r => r.SenderUsername).HasMaxLength(100);
        builder.Property(r => r.ReceiverId).IsRequired().HasMaxLength(100);
        builder.Property(r => r.ReceiverUsername).HasMaxLength(100);
        builder.Property(r => r.Status).IsRequired().HasMaxLength(20).HasDefaultValue("pending");
        builder.Property(r => r.CreatedAt).HasMaxLength(50);

        builder.HasIndex(r => r.ReceiverId);
        builder.HasIndex(r => r.SenderId);
    }
}
