using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Configurations;

public sealed class CatalogProductConfiguration : IEntityTypeConfiguration<CatalogProduct>
{
    private readonly bool _isSqlite;

    public CatalogProductConfiguration(bool isSqlite)
    {
        _isSqlite = isSqlite;
    }

    public void Configure(EntityTypeBuilder<CatalogProduct> builder)
    {
        builder.ToTable("catalog_products");
        builder.HasKey(c => c.Id);

        if (!_isSqlite)
        {
            builder.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()::text");
        }

        builder.Property(c => c.SellerId).IsRequired().HasMaxLength(100);
        builder.Property(c => c.ProductCode).IsRequired().HasMaxLength(100);
        builder.Property(c => c.ManufacturerId).HasMaxLength(100);
        builder.Property(c => c.ManufacturerName).HasMaxLength(200);
        builder.Property(c => c.Text).HasMaxLength(1000);
        builder.Property(c => c.Length).HasMaxLength(50);
        builder.Property(c => c.CreatedAt).HasMaxLength(50);

        if (!_isSqlite)
        {
            builder.Property(c => c.Extras).HasColumnType("jsonb");
        }
        else
        {
            var jsonOptions = new System.Text.Json.JsonSerializerOptions();
            builder.Property(c => c.Extras).HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, jsonOptions),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, ExtraValue>>(v, jsonOptions) ?? new Dictionary<string, ExtraValue>()
            );
        }

        builder.HasIndex(c => c.SellerId);
        builder.HasIndex(c => new { c.SellerId, c.ProductCode }).IsUnique();
    }
}
