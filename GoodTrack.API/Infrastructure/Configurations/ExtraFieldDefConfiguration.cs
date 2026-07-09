using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Configurations;

public sealed class ExtraFieldDefConfiguration : IEntityTypeConfiguration<ExtraFieldDef>
{
    private readonly bool _isSqlite;

    public ExtraFieldDefConfiguration(bool isSqlite)
    {
        _isSqlite = isSqlite;
    }

    public void Configure(EntityTypeBuilder<ExtraFieldDef> builder)
    {
        builder.ToTable("extra_field_defs");
        builder.HasKey(f => f.Id);

        if (!_isSqlite)
        {
            builder.Property(f => f.Id).HasDefaultValueSql("gen_random_uuid()::text");
        }

        builder.Property(f => f.Name).IsRequired().HasMaxLength(100);
        builder.Property(f => f.Type).IsRequired().HasMaxLength(50);
        builder.Property(f => f.CreatedBy).HasMaxLength(100);

        if (!_isSqlite)
        {
            builder.Property(f => f.Options).HasColumnType("text[]");
        }

        builder.HasIndex(f => f.CreatedBy);
    }
}
