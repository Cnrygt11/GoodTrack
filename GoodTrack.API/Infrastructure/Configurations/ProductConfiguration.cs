using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Configurations;

public sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    private readonly bool _isSqlite;

    public ProductConfiguration(bool isSqlite)
    {
        _isSqlite = isSqlite;
    }

    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("products");
        builder.HasKey(p => p.Id);

        if (!_isSqlite)
        {
            builder.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()::text");
        }

        builder.Property(p => p.Code).IsRequired().HasMaxLength(100);
        builder.Property(p => p.Status).IsRequired().HasMaxLength(50);
        builder.Property(p => p.SellerId).IsRequired().HasMaxLength(100);
        builder.Property(p => p.ManufacturerId).IsRequired().HasMaxLength(100);
        builder.Property(p => p.SellerName).HasMaxLength(200);
        builder.Property(p => p.ManufacturerName).HasMaxLength(200);
        builder.Property(p => p.CreatedAt).IsRequired();
        builder.Property(p => p.Quantity).HasDefaultValue(1);
        builder.Property(p => p.Text).HasMaxLength(1000);
        builder.Property(p => p.Length).HasMaxLength(50);
        builder.Property(p => p.DefectNote).HasMaxLength(1000);
        builder.Property(p => p.CustomerName).HasMaxLength(200);
        builder.Property(p => p.ShippingAddress).HasMaxLength(500);

        if (!_isSqlite)
        {
            builder.Property(p => p.Extras).HasColumnType("jsonb");
            builder.Property(p => p.Logs).HasColumnType("jsonb");
        }
        else
        {
            var jsonOptions = new System.Text.Json.JsonSerializerOptions();
            builder.Property(p => p.Extras).HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, jsonOptions),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, ExtraValue>>(v, jsonOptions) ?? new Dictionary<string, ExtraValue>()
            );
            builder.Property(p => p.Logs).HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, jsonOptions),
                v => System.Text.Json.JsonSerializer.Deserialize<List<OrderLog>>(v, jsonOptions) ?? new List<OrderLog>()
            );
        }

        builder.HasIndex(p => p.SellerId);
        builder.HasIndex(p => p.ManufacturerId);

        // Etsy senkronizasyonu: duplicate kontrolü (transaction) ve iptal eşleştirmesi (receipt).
        builder.HasIndex(p => new { p.SellerId, p.EtsyTransactionId });
        builder.HasIndex(p => new { p.SellerId, p.EtsyReceiptId });
    }
}
