using System;
using System.Collections.Generic;
using System.Linq;
using FluentAssertions;
using Xunit;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.Models;

namespace GoodTrack.API.Tests;

/// <summary>
/// Detay eşlemesi (ToDetailDto) ile liste projeksiyonunun (SummaryProjection) alan bazında
/// tutarlılığını doğrular. DTO'ya yeni alan eklenip eşlemelerden birinde unutulursa bu test kırılır;
/// iki şeklin bilinçli farkları (ağır görsel alanları, thumbnail fallback) açıkça listelenmiştir.
/// </summary>
public class ProductMappingsTests
{
    /// <summary>Liste projeksiyonunun bilinçli olarak detaydan farklı doldurduğu alanlar.</summary>
    private static readonly HashSet<string> IntentionalSummaryDifferences = new()
    {
        nameof(ProductResponseDto.Image),          // liste: her zaman null (ağır base64 taşınmaz)
        nameof(ProductResponseDto.DefectImage),    // liste: her zaman null (yalnız HasDefectImage bayrağı)
        nameof(ProductResponseDto.ThumbnailImage), // liste: thumbnail yoksa tam görsele düşer
    };

    private static Product FullyPopulatedProduct() => new()
    {
        Id = "p-1",
        Code = "SKU-1",
        Image = "data:image/png;base64,FULL",
        ThumbnailImage = "data:image/png;base64,THUMB",
        CatalogProductId = "cat-1",
        Text = "Açıklama",
        Length = "50cm",
        Extras = new Dictionary<string, ExtraValue>
        {
            ["f1"] = new ExtraValue { Name = "Renk", Type = "text", Value = "Mavi" },
        },
        Quantity = 3,
        Completed = true,
        IsDefective = true,
        IsPendingApproval = true,
        IsReproduction = true,
        DefectNote = "kusur notu",
        DefectImage = "data:image/png;base64,DEFECT",
        Status = "defective",
        Logs = new List<OrderLog>(),
        CreatedAt = new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc),
        CompletedAt = new DateTime(2026, 7, 2, 12, 0, 0, DateTimeKind.Utc),
        ArchivedAt = new DateTime(2026, 7, 3, 12, 0, 0, DateTimeKind.Utc),
        SlimmedAt = new DateTime(2026, 7, 4, 12, 0, 0, DateTimeKind.Utc),
        SellerId = "seller-1",
        ManufacturerId = "mfr-1",
        SellerName = "Satıcı",
        ManufacturerName = "Üretici",
        CancelRequested = true,
        EtsyReceiptId = 111,
        EtsyTransactionId = 222,
        CustomerName = "Müşteri Adı",
        ShippingAddress = "Adres 1",
        IsReadBySeller = false,
        IsReadByMfr = false,
    };

    [Fact]
    public void SummaryProjection_MatchesDetailDto_FieldByField()
    {
        var product = FullyPopulatedProduct();
        var detail = ProductMappings.ToDetailDto(product);
        var summary = ProductMappings.SummaryProjection.Compile()(product);

        foreach (var prop in typeof(ProductResponseDto).GetProperties())
        {
            if (IntentionalSummaryDifferences.Contains(prop.Name)) continue;

            var detailValue = prop.GetValue(detail);
            var summaryValue = prop.GetValue(summary);
            summaryValue.Should().BeEquivalentTo(detailValue,
                because: $"{prop.Name} iki eşlemede de aynı doldurulmalı (alan eklerken ProductMappings'teki İKİ şekli de güncelleyin)");
        }
    }

    [Fact]
    public void SummaryProjection_OmitsHeavyImageFields()
    {
        var product = FullyPopulatedProduct();
        var summary = ProductMappings.SummaryProjection.Compile()(product);

        summary.Image.Should().BeNull();
        summary.DefectImage.Should().BeNull();
        summary.HasDefectImage.Should().BeTrue();
        summary.ThumbnailImage.Should().Be(product.ThumbnailImage);
    }

    [Fact]
    public void SummaryProjection_FallsBackToFullImage_WhenThumbnailMissing()
    {
        var product = FullyPopulatedProduct();
        product.ThumbnailImage = null;

        var summary = ProductMappings.SummaryProjection.Compile()(product);

        summary.ThumbnailImage.Should().Be(product.Image);
    }

    [Fact]
    public void ToDetailDto_MasksCustomerInfo_ForManufacturer()
    {
        var product = FullyPopulatedProduct();

        var masked = ProductMappings.ToDetailDto(product, includeCustomerInfo: false);

        masked.CustomerName.Should().BeNull();
        masked.ShippingAddress.Should().BeNull();
    }

    /// <summary>
    /// Product'a eklenen yeni bir alan DTO'da da varsa eşlemelere yansıtılmalı; bu test
    /// varsayılan (unutulmuş) değerde kalan DTO alanlarını yakalar.
    /// </summary>
    [Fact]
    public void DetailDto_PopulatesEveryPropertyThatExistsOnProduct()
    {
        var product = FullyPopulatedProduct();
        var detail = ProductMappings.ToDetailDto(product);

        var productProps = typeof(Product).GetProperties().ToDictionary(p => p.Name);
        foreach (var dtoProp in typeof(ProductResponseDto).GetProperties())
        {
            if (!productProps.TryGetValue(dtoProp.Name, out var sourceProp)) continue;

            var detailValue = dtoProp.GetValue(detail);
            var sourceValue = sourceProp.GetValue(product);
            detailValue.Should().BeEquivalentTo(sourceValue,
                because: $"{dtoProp.Name} detay eşlemesinde Product'tan kopyalanmalı");
        }
    }
}
