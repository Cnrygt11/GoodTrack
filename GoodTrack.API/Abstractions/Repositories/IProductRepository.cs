using System;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using GoodTrack.API.Models;
using GoodTrack.API.DTOs.Product;

namespace GoodTrack.API.Abstractions.Repositories;

public interface IProductRepository
{
    Task<Product?> GetByIdAsync(string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Görselin (URL) satıcının başka bir siparişinde ana görsel olarak kullanılıp
    /// kullanılmadığını DB'de kontrol eder (satırlar belleğe yüklenmez). Arşivlenmiş siparişler
    /// de kapsanır. <paramref name="excludeProductId"/> null ise hiçbir sipariş hariç tutulmaz.
    /// Yalnız data-URI OLMAYAN (legacy/harici URL) görsellerde çağrılır; indeks gerektirmeyecek
    /// kadar nadirdir.
    /// </summary>
    Task<bool> IsImageUsedBySellerAsync(string sellerId, string imageUrl, string? excludeProductId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Görselin (URL) satıcının başka bir siparişinde kusur görseli olarak kullanılıp
    /// kullanılmadığını DB'de kontrol eder. <paramref name="excludeProductId"/> hariç tutulur.
    /// </summary>
    Task<bool> IsDefectImageUsedBySellerAsync(string sellerId, string imageUrl, string excludeProductId, CancellationToken cancellationToken = default);

    /// <summary>
    /// AKTİF sipariş listesi için hafif projeksiyon (arşivlenmişler hariç): tam <c>Image</c>
    /// DB'den çekilmez (yalnız <c>ThumbnailImage</c> taşınır). Tam görsel için
    /// <see cref="GetByIdAsync"/> kullanılır. Müşteri bilgisi maskeleme çağıran serviste uygulanır.
    /// </summary>
    Task<List<ProductResponseDto>> GetProductSummariesBySellerAsync(string sellerId, CancellationToken cancellationToken = default);
    Task<List<ProductResponseDto>> GetProductSummariesByManufacturerAsync(string mfrId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Arşivlenmiş (kargolandı/iptal) siparişlerin sayfalı özeti; ArchivedAt'e göre yeniden eskiye.
    /// </summary>
    Task<(List<ProductResponseDto> Items, int TotalCount)> GetArchivedSummariesPageAsync(
        string userId, bool asSeller, int page, int pageSize, CancellationToken cancellationToken = default);
    Task SaveAsync(Product product, CancellationToken cancellationToken = default);
    Task DeleteAsync(string id, CancellationToken cancellationToken = default);
    Task MarkProductsAsReadAsync(string userId, string role, string status, CancellationToken cancellationToken = default);

    /// <summary>
    /// <paramref name="cutoffUtc"/> tarihinden önce arşivlenmiş ve henüz küçültülmemiş siparişleri
    /// "başkalaştırır": görseller (Image/Thumbnail/DefectImage), katalog referansı ve müşteri
    /// PII'ı (ad, adres) kalıcı temizlenir, <c>SlimmedAt</c> damgalanır. Satır silinmez;
    /// minimum veriyle arşivde görünmeye devam eder. Etkilenen satır sayısını döner.
    /// </summary>
    Task<int> SlimOrdersArchivedBeforeAsync(DateTime cutoffUtc, CancellationToken cancellationToken = default);
}
