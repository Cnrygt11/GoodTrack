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
        return JsonSerializer.Deserialize<EtsyShopResult>(json);
    }

    public async Task<EtsyListingsContainer?> GetActiveListingsAsync(string shopId, EtsyCredentials credentials, CancellationToken cancellationToken = default)
    {
        var request = BuildAuthorizedRequest(HttpMethod.Get, $"v3/application/shops/{shopId}/listings/active?limit=100", credentials);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Failed to fetch active listings for shop {ShopId}. Status: {Status}, Error: {Error}", shopId, response.StatusCode, err);
            return null;
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        return JsonSerializer.Deserialize<EtsyListingsContainer>(json);
    }

    public async Task<string?> GetListingSkuAsync(long listingId, EtsyCredentials credentials, CancellationToken cancellationToken = default)
    {
        try
        {
            var request = BuildAuthorizedRequest(HttpMethod.Get, $"v3/application/listings/{listingId}/inventory", credentials);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var inventory = JsonSerializer.Deserialize<EtsyInventoryContainer>(json);
            return inventory?.Products?.FirstOrDefault()?.Sku;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch inventory/SKU for Listing: {ListingId}", listingId);
            return null;
        }
    }

    public async Task<string> GetListingImageAsBase64Async(string listingId, EtsyCredentials credentials, CancellationToken cancellationToken = default)
    {
        try
        {
            var request = BuildAuthorizedRequest(HttpMethod.Get, $"v3/application/listings/{listingId}/images", credentials);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return string.Empty;
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var imageContainer = JsonSerializer.Deserialize<EtsyListingImagesContainer>(json);
            var firstImage = imageContainer?.Results?.FirstOrDefault();

            if (firstImage == null || string.IsNullOrEmpty(firstImage.Url570xN))
            {
                return string.Empty;
            }

            var imageBytes = await _httpClient.GetByteArrayAsync(firstImage.Url570xN, cancellationToken);
            return $"data:image/jpeg;base64,{Convert.ToBase64String(imageBytes)}";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to download listing image for {ListingId}", listingId);
            return string.Empty;
        }
    }

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
        return JsonSerializer.Deserialize<EtsyReceipt>(json);
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
        return JsonSerializer.Deserialize<EtsyReceiptsContainer>(json);
    }

    private static HttpRequestMessage BuildAuthorizedRequest(HttpMethod method, string relativeUrl, EtsyCredentials credentials)
    {
        var request = new HttpRequestMessage(method, relativeUrl);
        request.Headers.Add("x-api-key", $"{credentials.Keystring}:{credentials.SharedSecret}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", credentials.AccessToken);
        return request;
    }
}
