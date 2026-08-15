using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using GoodTrack.API.DTOs.Etsy;

namespace GoodTrack.API.Abstractions.Services;

/// <summary>
/// Etsy Open API v3 ile konuşan typed HttpClient soyutlaması.
/// Tüm base URL'ler ve auth başlıkları (x-api-key + Bearer) tek yerde toplanır.
/// </summary>
public interface IEtsyApiClient
{
    Task<EtsyTokenResponse> ExchangeCodeForTokensAsync(string keystring, string sharedSecret, string authorizationCode, string codeVerifier, string redirectUri, CancellationToken cancellationToken = default);

    Task<EtsyTokenResponse> RefreshTokenAsync(string keystring, string sharedSecret, string refreshToken, CancellationToken cancellationToken = default);

    Task<EtsyShopResult?> GetShopByEtsyUserAsync(string etsyUserId, EtsyCredentials credentials, CancellationToken cancellationToken = default);

    Task<EtsyListingsContainer?> GetActiveListingsAsync(string shopId, EtsyCredentials credentials, CancellationToken cancellationToken = default);

    /// <summary>
    /// Birden çok listing'i tek çağrıda, gömülü görsel ile getirir
    /// (GET /v3/application/listings/batch?includes=Images). listing_ids max 100.
    /// N+1 çağrıyı (listing başına ayrı görsel isteği) önler.
    /// SKU bilgisi artık ayrı batch inventory endpoint'inden çekilir.
    /// </summary>
    Task<EtsyListingsContainer?> GetListingsBatchAsync(IEnumerable<long> listingIds, EtsyCredentials credentials, CancellationToken cancellationToken = default);

    /// <summary>
    /// Birden çok listing'in envanter (SKU) bilgisini tek çağrıda getirir
    /// (GET /v3/application/listings/batch/inventory?listing_ids=...).
    /// Etsy, Inventory'yi listings/batch includes'ından kaldırdığı için
    /// SKU bilgisi artık bu ayrık endpoint üzerinden çekilir.
    /// </summary>
    Task<EtsyBatchInventoryContainer?> GetListingsInventoryBatchAsync(IEnumerable<long> listingIds, EtsyCredentials credentials, CancellationToken cancellationToken = default);

    /// <summary>Verilen (Etsy CDN) görsel URL'sini indirip data:image base64 döndürür.</summary>
    Task<string> DownloadImageAsBase64Async(string imageUrl, CancellationToken cancellationToken = default);

    Task<EtsyReceipt?> GetReceiptAsync(string shopId, string receiptId, EtsyCredentials credentials, CancellationToken cancellationToken = default);

    Task<EtsyReceiptsContainer?> GetPaidReceiptsAsync(string shopId, EtsyCredentials credentials, int limit, CancellationToken cancellationToken = default);
}
