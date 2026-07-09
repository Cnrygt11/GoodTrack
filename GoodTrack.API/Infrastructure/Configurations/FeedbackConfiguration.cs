using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Configurations;

public sealed class FeedbackConfiguration : IEntityTypeConfiguration<Feedback>
{
    private readonly bool _isSqlite;

    public FeedbackConfiguration(bool isSqlite)
    {
        _isSqlite = isSqlite;
    }

    public void Configure(EntityTypeBuilder<Feedback> builder)
    {
        builder.ToTable("feedbacks");
        builder.HasKey(f => f.Id);

        if (!_isSqlite)
        {
            builder.Property(f => f.Id).HasDefaultValueSql("gen_random_uuid()::text");
        }

        builder.Property(f => f.UserId).HasMaxLength(100);
        builder.Property(f => f.Username).HasMaxLength(100);
        builder.Property(f => f.Role).HasMaxLength(20);
        builder.Property(f => f.Title).IsRequired().HasMaxLength(100);
        builder.Property(f => f.Message).IsRequired().HasMaxLength(2000);
        builder.Property(f => f.BrowserInfo).HasMaxLength(500);
        builder.Property(f => f.CreatedAt).HasMaxLength(50);
    }
}
