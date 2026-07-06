using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Models;
using GoodTrack.API.DTOs.Product;

namespace GoodTrack.API.Services;

public sealed class EtsyService : IEtsyService
{
    private readonly AppDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly IProductService _productService;
    private readonly ILogger<EtsyService> _logger;

    // OAuth geçici state takibi için ConcurrentDictionary (Thread-safe)
    private static readonly ConcurrentDictionary<string, PendingConnectionState> PendingConnections = new();

    public EtsyService(
        AppDbContext context,
        HttpClient httpClient,
        IProductService productService,
        ILogger<EtsyService> logger)
    {
        _context = context;
        _httpClient = httpClient;
        _productService = productService;
        _logger = logger;
    }

    public string GenerateOAuthUrl(string userId, string keystring, string sharedSecret, string redirectUri, out string codeVerifier)
    {
        codeVerifier = GenerateCodeVerifier();
        var codeChallenge = GenerateCodeChallenge(codeVerifier);
        var state = Guid.NewGuid().ToString("N");

        var pendingState = new PendingConnectionState
        {
            UserId = userId,
            Keystring = keystring,
            SharedSecret = sharedSecret,
            CodeVerifier = codeVerifier,
            CallbackUrl = redirectUri,
            CreatedAt = DateTime.UtcNow
        };

        // Eski veya süresi dolmuş state kayıtlarını temizle (Memory leak önleme)
        var expiredKeys = PendingConnections.Where(kvp => (DateTime.UtcNow - kvp.Value.CreatedAt).TotalMinutes > 15).Select(kvp => kvp.Key).ToList();
        foreach (var key in expiredKeys)
        {
            PendingConnections.TryRemove(key, out _);
        }

        PendingConnections[state] = pendingState;

        _logger.LogInformation("Generating Etsy OAuth URL for User {UserId} with state {State}", userId, state);

        var scope = Uri.EscapeDataString("transactions_r shops_r listings_r");
        return $"https://www.etsy.com/oauth/connect?" +
               $"response_type=code" +
               $"&client_id={keystring}" +
               $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
               $"&scope={scope}" +
               $"&state={state}" +
               $"&code_challenge={codeChallenge}" +
               $"&code_challenge_method=S256";
    }

    public async Task<EtsyConnection> ExchangeStateForTokensAsync(string state, string authorizationCode, CancellationToken cancellationToken = default)
    {
        if (!PendingConnections.TryRemove(state, out var pendingState))
        {
            throw new InvalidOperationException("Pending OAuth connection state not found or expired.");
        }

        return await ExchangeCodeForTokensAsync(
            pendingState.UserId,
            pendingState.Keystring,
            pendingState.SharedSecret,
            authorizationCode,
            pendingState.CodeVerifier,
            pendingState.CallbackUrl,
            cancellationToken);
    }

    public async Task<EtsyConnection> ExchangeCodeForTokensAsync(string userId, string keystring, string sharedSecret, string authorizationCode, string codeVerifier, string redirectUri, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Exchanging OAuth code for tokens. User: {UserId}", userId);

        var tokenUrl = "https://api.etsy.com/v3/public/oauth/token";
        var requestBody = new Dictionary<string, string>
        {
            { "grant_type", "authorization_code" },
            { "client_id", keystring },
            { "redirect_uri", redirectUri },
            { "code", authorizationCode },
            { "code_verifier", codeVerifier }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, tokenUrl)
        {
            Content = new FormUrlEncodedContent(requestBody)
        };
        request.Headers.Add("x-api-key", $"{keystring}:{sharedSecret}");

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Etsy token exchange failed. Status: {Status}, Body: {Body}", response.StatusCode, errorContent);
            throw new InvalidOperationException($"Etsy token exchange failed: {errorContent}");
        }

        var jsonContent = await response.Content.ReadAsStringAsync(cancellationToken);
        var tokenResponse = JsonSerializer.Deserialize<EtsyTokenResponse>(jsonContent);

        if (tokenResponse == null || string.IsNullOrEmpty(tokenResponse.AccessToken))
        {
            throw new InvalidOperationException("Etsy token response is invalid.");
        }

        // Access token içindeki Etsy user_id bilgisini al (123456.xxxx formatındadır)
        var etsyUserId = tokenResponse.AccessToken.Split('.').FirstOrDefault();
        if (string.IsNullOrEmpty(etsyUserId))
        {
            throw new InvalidOperationException("Failed to extract Etsy User ID from Access Token.");
        }

        // Etsy mağaza detaylarını çek
        var (shopId, shopName) = await FetchShopDetailsAsync(etsyUserId, keystring, sharedSecret, tokenResponse.AccessToken, cancellationToken);

        var connection = await _context.EtsyConnections.FirstOrDefaultAsync(c => c.UserId == userId && c.EtsyShopId == shopId, cancellationToken);
        if (connection == null)
        {
            connection = new EtsyConnection { UserId = userId, EtsyShopId = shopId };
            _context.EtsyConnections.Add(connection);
        }

        connection.EtsyShopName = shopName;
        connection.ApiKeyKeystring = keystring;
        connection.ApiKeySharedSecret = sharedSecret;
        connection.AccessToken = tokenResponse.AccessToken;
        connection.RefreshToken = tokenResponse.RefreshToken;
        connection.TokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);
        connection.IsActive = true;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Successfully connected Etsy shop {ShopName} ({ShopId}) for user {UserId}", shopName, shopId, userId);
        return connection;
     }

    public async Task<EtsyConnection> RefreshAccessTokenAsync(string userId, string shopId, CancellationToken cancellationToken = default)
    {
        var connection = await _context.EtsyConnections.FirstOrDefaultAsync(c => c.UserId == userId && c.EtsyShopId == shopId, cancellationToken);
        if (connection == null)
        {
            throw new InvalidOperationException($"Etsy connection not found for user {userId} and shop {shopId}.");
        }

        // Eğer token'ın süresi dolmadıysa yenilemeye gerek yok (güvenlik payı olarak son 5 dakika kala yenilenir)
        if (connection.TokenExpiresAt > DateTime.UtcNow.AddMinutes(5))
        {
            return connection;
        }

        _logger.LogInformation("Refreshing Etsy access token for user {UserId}", userId);

        var tokenUrl = "https://api.etsy.com/v3/public/oauth/token";
        var requestBody = new Dictionary<string, string>
        {
            { "grant_type", "refresh_token" },
            { "client_id", connection.ApiKeyKeystring },
            { "refresh_token", connection.RefreshToken }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, tokenUrl)
        {
            Content = new FormUrlEncodedContent(requestBody)
        };
        request.Headers.Add("x-api-key", $"{connection.ApiKeyKeystring}:{connection.ApiKeySharedSecret}");

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Etsy token refresh failed. Status: {Status}, Body: {Body}", response.StatusCode, errorContent);
            connection.IsActive = false; // Hata durumunda bağlantıyı pasif et
            await _context.SaveChangesAsync(cancellationToken);
            throw new InvalidOperationException($"Etsy token refresh failed: {errorContent}");
        }

        var jsonContent = await response.Content.ReadAsStringAsync(cancellationToken);
        var tokenResponse = JsonSerializer.Deserialize<EtsyTokenResponse>(jsonContent);

        if (tokenResponse == null || string.IsNullOrEmpty(tokenResponse.AccessToken))
        {
            throw new InvalidOperationException("Etsy refresh token response is invalid.");
        }

        connection.AccessToken = tokenResponse.AccessToken;
        connection.RefreshToken = tokenResponse.RefreshToken;
        connection.TokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);
        connection.IsActive = true;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Successfully refreshed Etsy access token for user {UserId}", userId);
        return connection;
    }

    public async Task<List<EtsyConnection>> GetConnectionsAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await _context.EtsyConnections.Where(c => c.UserId == userId).ToListAsync(cancellationToken);
    }

    public async Task<EtsyConnection?> GetConnectionAsync(string userId, string shopId, CancellationToken cancellationToken = default)
    {
        return await _context.EtsyConnections.FirstOrDefaultAsync(c => c.UserId == userId && c.EtsyShopId == shopId, cancellationToken);
    }

    public async Task<List<CatalogProduct>> FetchAndImportEtsyListingsAsync(string userId, CancellationToken cancellationToken = default)
    {
        var connections = await _context.EtsyConnections
            .Where(c => c.UserId == userId && c.IsActive)
            .ToListAsync(cancellationToken);

        var importedProducts = new List<CatalogProduct>();

        foreach (var connection in connections)
        {
            try
            {
                var refreshed = await RefreshAccessTokenAsync(userId, connection.EtsyShopId, cancellationToken);
                _logger.LogInformation("Fetching Etsy active listings for Shop: {ShopName}", refreshed.EtsyShopName);

                var url = $"https://api.etsy.com/v3/application/shops/{refreshed.EtsyShopId}/listings/active?limit=100";
                var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Add("x-api-key", $"{refreshed.ApiKeyKeystring}:{refreshed.ApiKeySharedSecret}");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", refreshed.AccessToken);

                var response = await _httpClient.SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    var err = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogError("Failed to fetch active listings for shop {ShopId}. Status: {Status}, Error: {Error}", refreshed.EtsyShopId, response.StatusCode, err);
                    continue;
                }

                var json = await response.Content.ReadAsStringAsync(cancellationToken);
                var listingsContainer = JsonSerializer.Deserialize<EtsyListingsContainer>(json);

                if (listingsContainer?.Results != null && listingsContainer.Results.Any())
                {
                    foreach (var etsyListing in listingsContainer.Results)
                    {
                        var productCode = $"etsy-{etsyListing.ListingId}";

                        var existingProduct = await _context.CatalogProducts
                            .FirstOrDefaultAsync(p => p.SellerId == userId && p.ProductCode == productCode, cancellationToken);

                        if (existingProduct != null)
                        {
                            existingProduct.Text = etsyListing.Title;
                            importedProducts.Add(existingProduct);
                            continue;
                        }

                        var base64Image = await FetchListingImageAsBase64Async(etsyListing.ListingId.ToString(), refreshed, cancellationToken);

                        var newProduct = new CatalogProduct
                        {
                            SellerId = userId,
                            ProductCode = productCode,
                            Image = base64Image,
                            Text = etsyListing.Title,
                            CreatedAt = DateTime.UtcNow.ToString("o")
                        };

                        _context.CatalogProducts.Add(newProduct);
                        importedProducts.Add(newProduct);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to import listings for shop {ShopId}", connection.EtsyShopId);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Imported/Updated {Count} Etsy active listings into Catalog for User {UserId}", importedProducts.Count, userId);

        return importedProducts;
    }

    public async Task ProcessEtsyOrderSyncAsync(string userId, string shopId, string receiptId, CancellationToken cancellationToken = default)
    {
        var connection = await RefreshAccessTokenAsync(userId, shopId, cancellationToken);

        _logger.LogInformation("Processing Etsy order sync. ReceiptId: {ReceiptId}", receiptId);

        var url = $"https://api.etsy.com/v3/application/shops/{shopId}/receipts/{receiptId}";
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("x-api-key", $"{connection.ApiKeyKeystring}:{connection.ApiKeySharedSecret}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", connection.AccessToken);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Failed to fetch receipt details. ReceiptId: {ReceiptId}, Error: {Error}", receiptId, err);
            throw new InvalidOperationException($"Etsy sipariş detayları çekilemedi: {err}");
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        var receipt = JsonSerializer.Deserialize<EtsyReceipt>(json);

        if (receipt == null || receipt.Transactions == null || !receipt.Transactions.Any())
        {
            _logger.LogWarning("Etsy receipt has no transactions to sync. ReceiptId: {ReceiptId}", receiptId);
            return;
        }

        var sellerUser = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);
        var sellerUsername = sellerUser?.Username ?? "Etsy Satıcı";

        foreach (var transaction in receipt.Transactions)
        {
            var productCode = $"etsy-{transaction.ListingId}";

            // Kataloğumuzda bu ürünü bul
            var catalogProduct = await _context.CatalogProducts
                .FirstOrDefaultAsync(p => p.SellerId == userId && p.ProductCode == productCode, cancellationToken);

            if (catalogProduct == null)
            {
                _logger.LogWarning("Etsy listing not found in catalog. ListingId: {ListingId}. Order cannot be auto-assigned.", transaction.ListingId);
                continue;
            }

            if (string.IsNullOrEmpty(catalogProduct.ManufacturerId))
            {
                _logger.LogWarning("Catalog product {ProductCode} has no manufacturer assigned. Skipping order creation.", productCode);
                continue;
            }

            // Zaten bu receipt_id ve listing_id ile sipariş oluşturulmuş mu kontrol et (Duplicate prevention)
            var orderCode = $"etsy-{receipt.ReceiptId}-{transaction.ListingId}";
            var existingOrder = await _context.Products.FirstOrDefaultAsync(p => p.Code == orderCode && p.SellerId == userId, cancellationToken);
            if (existingOrder != null)
            {
                _logger.LogInformation("Order {OrderCode} already exists. Skipping.", orderCode);
                continue;
            }

            // Varyasyonları ve kişiselleştirmeyi 'extras' alanına ekle
            var extras = new Dictionary<string, ExtraValue>();

            if (transaction.Variations != null && transaction.Variations.Any())
            {
                foreach (var variation in transaction.Variations)
                {
                    extras[variation.FormattedName] = new ExtraValue
                    {
                        Name = variation.FormattedName,
                        Type = "text",
                        Value = variation.FormattedValue
                    };
                }
            }

            if (!string.IsNullOrEmpty(transaction.Personalization))
            {
                extras["Kişiselleştirme"] = new ExtraValue
                {
                    Name = "Kişiselleştirme",
                    Type = "text",
                    Value = transaction.Personalization
                };
            }

            // Sipariş bilgilerini de ek özellik olarak ekleyelim
            extras["Etsy Sipariş No"] = new ExtraValue { Name = "Etsy Sipariş No", Type = "text", Value = receipt.ReceiptId.ToString() };
            extras["Müşteri Adı"] = new ExtraValue { Name = "Müşteri Adı", Type = "text", Value = receipt.Name };
            extras["Adres"] = new ExtraValue { Name = "Adres", Type = "text", Value = $"{receipt.FirstLine} {receipt.SecondLine}, {receipt.City}, {receipt.CountryIso}" };

            var createProductDto = new CreateProductDto
            {
                Code = orderCode,
                Image = catalogProduct.Image,
                Text = transaction.Title,
                Length = catalogProduct.Length,
                Extras = extras,
                ManufacturerId = catalogProduct.ManufacturerId,
                ManufacturerName = catalogProduct.ManufacturerName
            };

            await _productService.CreateOrderAsync(userId, sellerUsername, createProductDto);
            _logger.LogInformation("Created GoodTrack order {OrderCode} automatically from Etsy purchase.", orderCode);
        }
    }

    public async Task SyncRecentOrdersAsync(string userId, CancellationToken cancellationToken = default)
    {
        var connections = await _context.EtsyConnections
            .Where(c => c.UserId == userId && c.IsActive)
            .ToListAsync(cancellationToken);

        foreach (var connection in connections)
        {
            try
            {
                var refreshed = await RefreshAccessTokenAsync(userId, connection.EtsyShopId, cancellationToken);
                _logger.LogInformation("Syncing recent Etsy orders for Shop: {ShopName}", refreshed.EtsyShopName);

                var url = $"https://api.etsy.com/v3/application/shops/{refreshed.EtsyShopId}/receipts?was_paid=true&limit=20";
                var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Add("x-api-key", $"{refreshed.ApiKeyKeystring}:{refreshed.ApiKeySharedSecret}");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", refreshed.AccessToken);

                var response = await _httpClient.SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    var err = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogError("Failed to fetch recent receipts for shop {ShopId}. Error: {Error}", refreshed.EtsyShopId, err);
                    continue;
                }

                var json = await response.Content.ReadAsStringAsync(cancellationToken);
                var receiptsContainer = JsonSerializer.Deserialize<EtsyReceiptsContainer>(json);

                if (receiptsContainer?.Results != null && receiptsContainer.Results.Any())
                {
                    foreach (var receipt in receiptsContainer.Results)
                    {
                        try
                        {
                            await ProcessEtsyOrderSyncAsync(userId, refreshed.EtsyShopId, receipt.ReceiptId.ToString(), cancellationToken);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error processing sync for Receipt ID: {ReceiptId}", receipt.ReceiptId);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to sync orders for shop {ShopId}", connection.EtsyShopId);
            }
        }
    }

    // ── Yardımcı Metotlar (Helpers) ───────────────────────────────────────────

    private async Task<(string ShopId, string ShopName)> FetchShopDetailsAsync(string etsyUserId, string keystring, string sharedSecret, string accessToken, CancellationToken cancellationToken)
    {
        var url = $"https://api.etsy.com/v3/application/users/{etsyUserId}/shops";
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("x-api-key", $"{keystring}:{sharedSecret}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Failed to fetch shop details. User: {User}, Error: {Error}", etsyUserId, err);
            throw new InvalidOperationException("Etsy mağaza detayları alınamadı.");
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        _logger.LogInformation("Raw Etsy shop details response for User ID {UserId}: {JsonResponse}", etsyUserId, json);
        var shop = JsonSerializer.Deserialize<EtsyShopResult>(json);
        if (shop == null || shop.ShopId == 0)
        {
            throw new InvalidOperationException("Kullanıcıya ait Etsy mağazası bulunamadı.");
        }

        return (shop.ShopId.ToString(), shop.ShopName);
    }

    private async Task<string> FetchListingImageAsBase64Async(string listingId, EtsyConnection connection, CancellationToken cancellationToken)
    {
        try
        {
            var url = $"https://api.etsy.com/v3/application/listings/{listingId}/images";
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("x-api-key", $"{connection.ApiKeyKeystring}:{connection.ApiKeySharedSecret}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", connection.AccessToken);

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
            return Convert.ToBase64String(imageBytes);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to download listing image for {ListingId}", listingId);
            return string.Empty;
        }
    }

    private static string GenerateCodeVerifier()
    {
        var bytes = new byte[32];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(bytes);
        }
        return Base64UrlEncode(bytes);
    }

    private static string GenerateCodeChallenge(string codeVerifier)
    {
        using (var sha256 = SHA256.Create())
        {
            var bytes = Encoding.ASCII.GetBytes(codeVerifier);
            var hash = sha256.ComputeHash(bytes);
            return Base64UrlEncode(hash);
        }
    }

    private static string Base64UrlEncode(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    // ── OAuth ve Eşleme Durumu Sınıfları (Inner Classes) ────────────────────────

    private sealed class PendingConnectionState
    {
        public string UserId { get; set; } = string.Empty;
        public string Keystring { get; set; } = string.Empty;
        public string SharedSecret { get; set; } = string.Empty;
        public string CodeVerifier { get; set; } = string.Empty;
        public string CallbackUrl { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    // Etsy DTO'lar için inner veya local class'lar
    private sealed class EtsyTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; } = string.Empty;

        [JsonPropertyName("token_type")]
        public string TokenType { get; set; } = string.Empty;

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }

        [JsonPropertyName("refresh_token")]
        public string RefreshToken { get; set; } = string.Empty;
    }

    private sealed class EtsyShopsContainer
    {
        [JsonPropertyName("results")]
        public List<EtsyShopResult>? Results { get; set; }
    }

    private sealed class EtsyShopResult
    {
        [JsonPropertyName("shop_id")]
        public int ShopId { get; set; }

        [JsonPropertyName("shop_name")]
        public string ShopName { get; set; } = string.Empty;
    }

    private sealed class EtsyListingsContainer
    {
        [JsonPropertyName("results")]
        public List<EtsyListingResult>? Results { get; set; }
    }

    private sealed class EtsyListingResult
    {
        [JsonPropertyName("listing_id")]
        public int ListingId { get; set; }

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;
    }

    private sealed class EtsyListingImagesContainer
    {
        [JsonPropertyName("results")]
        public List<EtsyListingImageResult>? Results { get; set; }
    }

    private sealed class EtsyListingImageResult
    {
        [JsonPropertyName("url_570xN")]
        public string Url570xN { get; set; } = string.Empty;
    }

    private sealed class EtsyReceiptsContainer
    {
        [JsonPropertyName("results")]
        public List<EtsyReceipt>? Results { get; set; }
    }

    private sealed class EtsyReceipt
    {
        [JsonPropertyName("receipt_id")]
        public int ReceiptId { get; set; }

        [JsonPropertyName("shop_id")]
        public int ShopId { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("first_line")]
        public string FirstLine { get; set; } = string.Empty;

        [JsonPropertyName("second_line")]
        public string SecondLine { get; set; } = string.Empty;

        [JsonPropertyName("city")]
        public string City { get; set; } = string.Empty;

        [JsonPropertyName("state")]
        public string State { get; set; } = string.Empty;

        [JsonPropertyName("zip")]
        public string Zip { get; set; } = string.Empty;

        [JsonPropertyName("country_iso")]
        public string CountryIso { get; set; } = string.Empty;

        [JsonPropertyName("formatted_address")]
        public string FormattedAddress { get; set; } = string.Empty;

        [JsonPropertyName("transactions")]
        public List<EtsyTransaction>? Transactions { get; set; }
    }

    private sealed class EtsyTransaction
    {
        [JsonPropertyName("listing_id")]
        public int ListingId { get; set; }

        [JsonPropertyName("quantity")]
        public int Quantity { get; set; }

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("variations")]
        public List<EtsyTransactionVariation>? Variations { get; set; }

        [JsonPropertyName("personalization")]
        public string? Personalization { get; set; }
    }

    private sealed class EtsyTransactionVariation
    {
        [JsonPropertyName("formatted_name")]
        public string FormattedName { get; set; } = string.Empty;

        [JsonPropertyName("formatted_value")]
        public string FormattedValue { get; set; } = string.Empty;
    }
}
