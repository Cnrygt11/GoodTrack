using System;
using System.Linq.Expressions;
using GoodTrack.API.Models;

namespace GoodTrack.API.DTOs.Product;

/// <summary>
/// Product → ProductResponseDto eşlemelerinin tek kaynağı. İki şekil vardır:
/// <see cref="ToDetailDto"/> (detay: tam görseller dahil) ve
/// <see cref="SummaryProjection"/> (liste: ağır base64 alanları taşınmaz).
/// DTO'ya alan eklerken iki eşlemeyi de burada güncelleyin;
/// ProductMappingsTests iki şeklin alan bazında tutarlılığını doğrular.
/// </summary>
public static class ProductMappings
{
    /// <summary>
    /// Detay eşlemesi — tam görseller dahil. <paramref name="includeCustomerInfo"/>
    /// false ise müşteri adı ve teslimat adresi yanıttan çıkarılır (üretici bu bilgileri görmemelidir).
    /// </summary>
    public static ProductResponseDto ToDetailDto(Models.Product product, bool includeCustomerInfo = true)
    {
        return new ProductResponseDto
        {
            EtsyReceiptId = product.EtsyReceiptId,
            CustomerName = includeCustomerInfo ? product.CustomerName : null,
            ShippingAddress = includeCustomerInfo ? product.ShippingAddress : null,
            Id = product.Id,
            Code = product.Code,
            Image = product.Image,
            ThumbnailImage = product.ThumbnailImage,
            CatalogProductId = product.CatalogProductId,
            Text = product.Text,
            Length = product.Length,
            Extras = product.Extras,
            Quantity = product.Quantity,
            Completed = product.Completed,
            IsDefective = product.IsDefective,
            IsPendingApproval = product.IsPendingApproval,
            IsReproduction = product.IsReproduction,
            DefectNote = product.DefectNote,
            DefectImage = product.DefectImage,
            HasDefectImage = product.DefectImage != null,
            Status = product.Status,
            Logs = product.Logs,
            CreatedAt = product.CreatedAt,
            CompletedAt = product.CompletedAt,
            ArchivedAt = product.ArchivedAt,
            SlimmedAt = product.SlimmedAt,
            SellerId = product.SellerId,
            ManufacturerId = product.ManufacturerId,
            SellerName = product.SellerName,
            ManufacturerName = product.ManufacturerName,
            CancelRequested = product.CancelRequested,
            IsReadBySeller = product.IsReadBySeller,
            IsReadByMfr = product.IsReadByMfr
        };
    }

    /// <summary>
    /// Liste projeksiyonu (EF-translatable): tam <c>Image</c> ve <c>DefectImage</c> null bırakılır
    /// (DB'den çekilmez), yalnız <c>ThumbnailImage</c> taşınır. Diğer tüm alanlar (müşteri bilgisi
    /// dahil; maskeleme serviste) döner.
    /// </summary>
    public static readonly Expression<Func<Models.Product, ProductResponseDto>> SummaryProjection = p => new ProductResponseDto
    {
        Id = p.Id,
        Code = p.Code,
        Image = null,
        // Thumbnail varsa onu, yoksa tam görsele düşerek taşı (eski kayıtlar/kırık görsel olmaz).
        // Yeni yüklemeler gerçek küçük thumbnail gönderdiğinden liste yükü progresif azalır.
        ThumbnailImage = p.ThumbnailImage != null ? p.ThumbnailImage : p.Image,
        CatalogProductId = p.CatalogProductId,
        Text = p.Text,
        Length = p.Length,
        Extras = p.Extras,
        Quantity = p.Quantity,
        Completed = p.Completed,
        IsDefective = p.IsDefective,
        IsPendingApproval = p.IsPendingApproval,
        IsReproduction = p.IsReproduction,
        DefectNote = p.DefectNote,
        // Kusur görseli 7MB'a varan base64 olabilir; liste yalnız varlık bayrağını taşır,
        // tam görsel detay yanıtından (GetByIdAsync yolu) gelir.
        DefectImage = null,
        HasDefectImage = p.DefectImage != null,
        Status = p.Status,
        Logs = p.Logs,
        CreatedAt = p.CreatedAt,
        CompletedAt = p.CompletedAt,
        ArchivedAt = p.ArchivedAt,
        SlimmedAt = p.SlimmedAt,
        SellerId = p.SellerId,
        ManufacturerId = p.ManufacturerId,
        SellerName = p.SellerName,
        ManufacturerName = p.ManufacturerName,
        CancelRequested = p.CancelRequested,
        EtsyReceiptId = p.EtsyReceiptId,
        CustomerName = p.CustomerName,
        ShippingAddress = p.ShippingAddress,
        IsReadBySeller = p.IsReadBySeller,
        IsReadByMfr = p.IsReadByMfr,
    };
}
