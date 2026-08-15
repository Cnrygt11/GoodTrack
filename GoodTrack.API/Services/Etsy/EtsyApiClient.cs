using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Etsy;

namespace GoodTrack.API.Services.Etsy;

/// <summary>
/// Etsy Open API v3 için typed HttpClient. Auth başlıkları ve endpoint yolları
/// burada tek yerde toplanır; çağıranlar yalnızca kimlik bilgilerini geçer.
/// HttpClient.BaseAddress "https://api.etsy.com/" olarak DI'da yapılandırılır.
/// </summary>
public sealed class EtsyApiClient : IEtsyApiClient
{
    /// <summary>
    /// Etsy yanıtlarındaki tüm string alanlar HTML-decode edilir
    /// (ör. "Buyer&amp;#39;s Note" → "Buyer's Note", "26&amp;quot;" → 26").
    /// </summary>
    private static readonly JsonSerializerOptions EtsyJsonOptions = new()
    {
        Converters = { new HtmlDecodingStringConverter() }
    };

    private readonly HttpClient _httpClient;
    private readonly ILogger<EtsyApiClient> _logger;

    public EtsyApiClient(HttpClient httpClient, ILogger<EtsyApiClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<EtsyTokenResponse> ExchangeCodeForTokensAsync(string keystring, string sharedSecret, string authorizationCode, string codeVerifier, string redirectUri, CancellationToken cancellationToken = default)
    {
        var body = new Dictionary<string, string>
        {
            { "grant_type", "authorization_code" },
            { "client_id", keystring },
            { "redirect_uri", redirectUri },
            { "code", authorizationCode },
            { "code_verifier", codeVerifier }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "v3/public/oauth/token")
        {
            Content = new FormUrlEncodedContent(body)
        };
        request.Headers.Add("x-api-key", $"{keystring}:{sharedSecret}");

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Etsy token exchange failed. Status: {Status}, Body: {Body}", response.StatusCode, errorContent);
            throw new InvalidOperationException($"Etsy token exchange failed: {errorContent}");
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        var tokenResponse = JsonSerializer.Deserialize<EtsyTokenResponse>(json);
        if (tokenResponse == null || string.IsNullOrEmpty(tokenResponse.AccessToken))
        {
            throw new InvalidOperationException("Etsy token response is invalid.");
        }

        return tokenResponse;
    }

    public async Task<EtsyTokenResponse> RefreshTokenAsync(string keystring, string sharedSecret, string refreshToken, CancellationToken cancellationToken = default)
    {
        var body = new Dictionary<string, string>
        {
            { "grant_type", "refresh_token" },
            { "client_id", keystring },
            { "refresh_token", refreshToken }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "v3/public/oauth/token")
        {
            Content = new FormUrlEncodedContent(body)
        };
        request.Headers.Add("x-api-key", $"{keystring}:{sharedSecret}");

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Etsy token refresh failed. Status: {Status}, Body: {Body}", response.StatusCode, errorContent);
            throw new InvalidOperationException($"Etsy token refresh failed: {errorContent}");
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        var tokenResponse = JsonSerializer.Deserialize<EtsyTokenResponse>(json);
        if (tokenResponse == null || string.IsNullOrEmpty(tokenResponse.AccessToken))
        {
            throw new InvalidOperationException("Etsy refresh token response is invalid.");
        }

        return tokenResponse;
    }

    public async Task<EtsyShopResult?> GetShopByEtsyUserAsync(string etsyUserId, EtsyCredentials credentials, CancellationToken cancellationToken = default)
    {
        var request = BuildAuthorizedRequest(HttpMethod.Get, $"v3/application/users/{etsyUserId}/shops", credentials);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Failed to fetch shop details. User: {User}, Error: {Error}", etsyUserId, err);
            throw new InvalidOperationException("Etsy mağaza detayları alınamadı.");
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        return JsonSerializer.Deserialize<EtsyShopResult>(json, EtsyJsonOptions);
    }

    public async Task<EtsyListingsContainer?> GetActiveListingsAsync(string shopId, EtsyCredentials credentials, CancellationToken cancellationToken = default)
    {
        // Etsy tek çağrıda en fazla 100 listing döner. Mağazanın TÜM aktif ürünlerini
        // almak için offset ile sayfa sayfa gezip sonuçları birleştiriyoruz.
        const int pageSize = 100;
        const int maxPages = 50; // Güvenlik tavanı: 50 x 100 = 5000 listing

        var aggregated = new List<EtsyListingResult>();
        var offset = 0;

        for (var page = 0; page < maxPages; page++)
        {
            var url = $"v3/application/shops/{shopId}/listings?state=active&limit={pageSize}&offset={offset}";
            var request = BuildAuthorizedRequest(HttpMethod.Get, url, credentials);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Failed to fetch active listings for shop {ShopId}. Status: {Status}, Offset: {Offset}, Error: {Error}", shopId, response.StatusCode, offset, err);

                // İlk sayfa başarısızsa hiç veri yok → null (mevcut davranış).
                // Sonraki sayfada hata olursa o ana dek toplananlarla kısmi başarı dön.
                return offset == 0 ? null : new EtsyListingsContainer { Count = aggregated.Count, Results = aggregated };
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var pageContainer = JsonSerializer.Deserialize<EtsyListingsContainer>(json, EtsyJsonOptions);

            var pageResults = pageContainer?.Results;
            if (pageResults == null || pageResults.Count == 0)
            {
                break;
            }

            aggregated.AddRange(pageResults);

            // Bu sayfa tam dolu değilse son sayfadayız; ya da bildirilen toplam sayıya ulaştık.
            if (pageResults.Count < pageSize || aggregated.Count >= pageContainer!.Count)
            {
                break;
            }

            offset += pageSize;
        }

        return new EtsyListingsContainer { Count = aggregated.Count, Results = aggregated };
    }

    public async Task<EtsyListingsContainer?> GetListingsBatchAsync(IEnumerable<long> listingIds, EtsyCredentials credentials, CancellationToken cancellationToken = default)
    {
        var ids = string.Join(",", listingIds);
        if (string.IsNullOrEmpty(ids))
        {
            return new EtsyListingsContainer { Count = 0, Results = new List<EtsyListingResult>() };
        }

        var url = $"v3/application/listings/batch?listing_ids={ids}&includes=Images";
        var request = BuildAuthorizedRequest(HttpMethod.Get, url, credentials);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Failed to fetch listings batch. Status: {Status}, Error: {Error}", response.StatusCode, err);
            return null;
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        return JsonSerializer.Deserialize<EtsyListingsContainer>(json, EtsyJsonOptions);
    }

    public async Task<EtsyBatchInventoryContainer?> GetListingsInventoryBatchAsync(IEnumerable<long> listingIds, EtsyCredentials credentials, CancellationToken cancellationToken = default)
    {
        var ids = string.Join(",", listingIds);
        if (string.IsNullOrEmpty(ids))
        {
            return new EtsyBatchInventoryContainer { Results = new List<EtsyBatchInventoryResult>() };
        }

        var url = $"v3/application/listings/batch/inventory?listing_ids={ids}";
        var request = BuildAuthorizedRequest(HttpMethod.Get, url, credentials);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning("Failed to fetch listings batch inventory. Status: {Status}, Error: {Error}", response.StatusCode, err);
            return null;
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        return JsonSerializer.Deserialize<EtsyBatchInventoryContainer>(json, EtsyJsonOptions);
    }

    public async Task<string> DownloadImageAsBase64Async(string imageUrl, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(imageUrl))
        {
            return string.Empty;
        }

        try
        {
            var imageBytes = await _httpClient.GetByteArrayAsync(imageUrl, cancellationToken);
            return $"data:image/jpeg;base64,{Convert.ToBase64String(imageBytes)}";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to download listing image from {ImageUrl}", imageUrl);
            return string.Empty;
        }
    }

    // NOT (Etsy API Terms): Receipt/sipariş yanıtları alıcı kişisel verisi (isim, adres) içerir.
    // Bu veriler BİLİNÇLİ olarak önbelleğe alınmaz; her seferinde canlı çekilir.
    public async Task<EtsyReceipt?> GetReceiptAsync(string shopId, string receiptId, EtsyCredentials credentials, CancellationToken cancellationToken = default)
    {
        var request = BuildAuthorizedRequest(HttpMethod.Get, $"v3/application/shops/{shopId}/receipts/{receiptId}", credentials);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Failed to fetch receipt details. ReceiptId: {ReceiptId}, Error: {Error}", receiptId, err);
            throw new InvalidOperationException($"Etsy sipariş detayları çekilemedi: {err}");
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        return JsonSerializer.Deserialize<EtsyReceipt>(json, EtsyJsonOptions);
    }

    public async Task<EtsyReceiptsContainer?> GetPaidReceiptsAsync(string shopId, EtsyCredentials credentials, int limit, CancellationToken cancellationToken = default)
    {
        var request = BuildAuthorizedRequest(HttpMethod.Get, $"v3/application/shops/{shopId}/receipts?status=paid&limit={limit}", credentials);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Failed to fetch recent receipts for shop {ShopId}. Error: {Error}", shopId, err);
            return null;
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        return JsonSerializer.Deserialize<EtsyReceiptsContainer>(json, EtsyJsonOptions);
    }

    private static HttpRequestMessage BuildAuthorizedRequest(HttpMethod method, string relativeUrl, EtsyCredentials credentials)
    {
        var request = new HttpRequestMessage(method, relativeUrl);
        request.Headers.Add("x-api-key", $"{credentials.Keystring}:{credentials.SharedSecret}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", credentials.AccessToken);
        return request;
    }
}
