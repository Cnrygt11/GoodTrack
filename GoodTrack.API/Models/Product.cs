using GoodTrack.API.Constants;
using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace GoodTrack.API.Models;

public class Product
{
    public string Id { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Code { get; set; } = string.Empty;

    // Base64 image — max ~5MB binary
    [MaxLength(ImageLimits.MaxBase64Length)]
    public string? Image { get; set; }

    /// <summary>
    /// Liste/kartlarda gösterilen küçük thumbnail (~160px). Manuel yüklemelerde base64, Etsy'de CDN URL.
    /// Liste projeksiyonları bunu taşır; tam <see cref="Image"/> yalnız detayda döner.
    /// </summary>
    [MaxLength(ImageLimits.MaxThumbnailBase64Length)]
    public string? ThumbnailImage { get; set; }

    /// <summary>
    /// Siparişin görselinin alındığı katalog ürünü. Doluysa tam görsel siparişe KOPYALANMAZ
    /// (<see cref="Image"/> null kalır); detay yanıtında görsel katalogtan çözülür. Kullanıcı
    /// siparişe özel görsel yüklerse referans temizlenir ve görsel siparişte tutulur.
    /// </summary>
    [MaxLength(50)]
    public string? CatalogProductId { get; set; }

    [MaxLength(1000)]
    public string? Text { get; set; }

    [MaxLength(50)]
    public string? Length { get; set; }

    public Dictionary<string, ExtraValue>? Extras { get; set; }

    /// <summary>
    /// Sipariş adedi. Aynı ürünün aynı ekstra özelliklerle birden fazla alınması
    /// tek sipariş kartında bu adetle gösterilir (varsayılan 1). Farklı ekstra
    /// özellikli alımlar ise ayrı siparişlere bölünür.
    /// </summary>
    public int Quantity { get; set; } = 1;

    public bool Completed { get; set; }

    public bool IsDefective { get; set; }

    public bool IsPendingApproval { get; set; }

    public bool IsReproduction { get; set; }

    [MaxLength(1000)]
    public string? DefectNote { get; set; }

    // Base64 image — max ~5MB binary
    [MaxLength(ImageLimits.MaxBase64Length)]
    public string? DefectImage { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = string.Empty;

    public List<OrderLog> Logs { get; set; } = new();

    public DateTime CreatedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// Sipariş terminal ("arşiv") duruma (kargolandı/iptal) ilk geçtiği an. Yaşam döngüsü
    /// burada sona erer. Hata/kusur görsellerinin grace period sonrası temizliği bu damgaya
    /// dayanır (bkz. DefectImageRetentionService). SaveChanges sırasında merkezî olarak damgalanır.
    /// </summary>
    public DateTime? ArchivedAt { get; set; }

    /// <summary>
    /// Arşivdeki siparişin "başkalaşım" (küçültme) anı. Arşivlenmeden 30 gün sonra retention job'ı
    /// ağır alanları (görseller, katalog referansı) ve müşteri PII'ını (ad, adres) kalıcı temizler;
    /// sipariş minimum veriyle süresiz saklanır ve arşivde görünmeye devam eder. Null = henüz tam veri.
    /// </summary>
    public DateTime? SlimmedAt { get; set; }

    [MaxLength(50)]
    public string SellerId { get; set; } = string.Empty;

    [MaxLength(50)]
    [JsonPropertyName("mfrId")]
    public string ManufacturerId { get; set; } = string.Empty;

    [MaxLength(100)]
    public string SellerName { get; set; } = string.Empty;

    [MaxLength(100)]
    [JsonPropertyName("mfrName")]
    public string ManufacturerName { get; set; } = string.Empty;

    public bool CancelRequested { get; set; }

    // ── Etsy kaynaklı sipariş meta verisi ────────────────────────────────────
    // Code artık ürünün SKU'sudur; Etsy kimliği bu alanlarda tutulur.
    // Duplicate önleme EtsyTransactionId, iptal eşleştirmesi EtsyReceiptId üzerinden yapılır.

    /// <summary>Etsy sipariş (receipt) numarası. Manuel siparişlerde null.</summary>
    public long? EtsyReceiptId { get; set; }

    /// <summary>Etsy işlem (transaction) numarası — satır bazında benzersiz. Manuel siparişlerde null.</summary>
    public long? EtsyTransactionId { get; set; }

    /// <summary>Müşteri adı. HASSAS: üreticiye gönderilen yanıtlarda gizlenir.</summary>
    [MaxLength(200)]
    public string? CustomerName { get; set; }

    /// <summary>Teslimat adresi. HASSAS: üreticiye gönderilen yanıtlarda gizlenir.</summary>
    [MaxLength(500)]
    public string? ShippingAddress { get; set; }

    public bool IsReadBySeller { get; set; } = true;

    public bool IsReadByMfr { get; set; } = true;
}

public class ExtraValue
{
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Type { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Value { get; set; } = string.Empty;
}
