using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Etsy;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Models;

namespace GoodTrack.API.Services;

/// <summary>
/// Etsy entegrasyon orkestrasyonu: OAuth token yaşam döngüsü, aktif ürün (listing) içe
/// aktarımı ve sipariş (receipt) senkronizasyonu. Ham HTTP çağrıları <see cref="IEtsyApiClient"/>,
/// OAuth/PKCE <see cref="IEtsyOAuthService"/>, bağlantı kalıcılığı ise
/// <see cref="IEtsyConnectionRepository"/> tarafından yönetilir.
/// </summary>
public sealed class EtsyService : IEtsyService
{
    private readonly AppDbContext _context;
    private readonly IEtsyApiClient _apiClient;
    private readonly IEtsyOAuthService _oauthService;
    private readonly IEtsyConnectionRepository _connectionRepository;
    private readonly IProductService _productService;
    private readonly ILogger<EtsyService> _logger;

    public EtsyService(
        AppDbContext context,
        IEtsyApiClient apiClient,
        IEtsyOAuthService oauthService,
        IEtsyConnectionRepository connectionRepository,
        IProductService productService,
        ILogger<EtsyService> logger)
    {
        _context = context;
        _apiClient = apiClient;
        _oauthService = oauthService;
        _connectionRepository = connectionRepository;
        _productService = productService;
        _logger = logger;
    }

    public string GenerateOAuthUrl(string userId, string keystring, string sharedSecret, string redirectUri, out string codeVerifier)
    {
        return _oauthService.GenerateOAuthUrl(userId, keystring, sharedSecret, redirectUri, out codeVerifier);
    }

    public async Task<EtsyConnection> ExchangeStateForTokensAsync(string state, string authorizationCode, CancellationToken cancellationToken = default)
    {
        var pending = _oauthService.ConsumePendingConnection(state)
            ?? throw new InvalidOperationException("Pending OAuth connection state not found or expired.");

        return await ExchangeCodeForTokensAsync(
            pending.UserId,
            pending.Keystring,
            pending.SharedSecret,
            authorizationCode,
            pending.CodeVerifier,
            pending.CallbackUrl,
            cancellationToken);
    }

    public async Task<EtsyConnection> ExchangeCodeForTokensAsync(string userId, string keystring, string sharedSecret, string authorizationCode, string codeVerifier, string redirectUri, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Exchanging OAuth code for tokens. User: {UserId}", userId);

        var tokenResponse = await _apiClient.ExchangeCodeForTokensAsync(keystring, sharedSecret, authorizationCode, codeVerifier, redirectUri, cancellationToken);

        // Access token içindeki Etsy user_id bilgisini al (123456.xxxx formatındadır)
        var etsyUserId = tokenResponse.AccessToken.Split('.').FirstOrDefault();
        if (string.IsNullOrEmpty(etsyUserId))
        {
            throw new InvalidOperationException("Failed to extract Etsy User ID from Access Token.");
        }

        var credentials = new EtsyCredentials(keystring, sharedSecret, tokenResponse.AccessToken);
        var shop = await _apiClient.GetShopByEtsyUserAsync(etsyUserId, credentials, cancellationToken);
        if (shop == null || shop.ShopId == 0)
        {
            throw new InvalidOperationException("Kullanıcıya ait Etsy mağazası bulunamadı.");
        }

        var shopId = shop.ShopId.ToString();

        var connection = await _connectionRepository.GetAsync(userId, shopId, cancellationToken);
        if (connection == null)
        {
            connection = new EtsyConnection { UserId = userId, EtsyShopId = shopId };
            await _connectionRepository.AddAsync(connection, cancellationToken);
        }

        connection.EtsyShopName = shop.ShopName;
        connection.ApiKeyKeystring = keystring;
        connection.ApiKeySharedSecret = sharedSecret;
        connection.AccessToken = tokenResponse.AccessToken;
        connection.RefreshToken = tokenResponse.RefreshToken;
        connection.TokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);
        connection.IsActive = true;

        await _connectionRepository.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Successfully connected Etsy shop {ShopName} ({ShopId}) for user {UserId}", shop.ShopName, shopId, userId);
        return connection;
    }

    public async Task<EtsyConnection> RefreshAccessTokenAsync(string userId, string shopId, CancellationToken cancellationToken = default)
    {
        var connection = await _connectionRepository.GetAsync(userId, shopId, cancellationToken)
            ?? throw new InvalidOperationException($"Etsy connection not found for user {userId} and shop {shopId}.");

        // Token'ın süresi dolmadıysa yenilemeye gerek yok (güvenlik payı olarak son 5 dakika kala yenilenir)
        if (connection.TokenExpiresAt > DateTime.UtcNow.AddMinutes(5))
        {
            return connection;
        }

        _logger.LogInformation("Refreshing Etsy access token for user {UserId}", userId);

        DTOs.Etsy.EtsyTokenResponse tokenResponse;
        try
        {
            tokenResponse = await _apiClient.RefreshTokenAsync(connection.ApiKeyKeystring, connection.ApiKeySharedSecret, connection.RefreshToken, cancellationToken);
        }
        catch
        {
            connection.IsActive = false; // Hata durumunda bağlantıyı pasif et
            await _connectionRepository.SaveChangesAsync(cancellationToken);
            throw;
        }

        connection.AccessToken = tokenResponse.AccessToken;
        connection.RefreshToken = tokenResponse.RefreshToken;
        connection.TokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);
        connection.IsActive = true;

        await _connectionRepository.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Successfully refreshed Etsy access token for user {UserId}", userId);
        return connection;
    }

    public Task<List<EtsyConnection>> GetConnectionsAsync(string userId, CancellationToken cancellationToken = default)
    {
        return _connectionRepository.GetAllForUserAsync(userId, cancellationToken);
    }

    public Task<EtsyConnection?> GetConnectionAsync(string userId, string shopId, CancellationToken cancellationToken = default)
    {
        return _connectionRepository.GetAsync(userId, shopId, cancellationToken);
    }

    public async Task<List<CatalogProduct>> FetchAndImportEtsyListingsAsync(string userId, CancellationToken cancellationToken = default)
    {
        var connections = await _connectionRepository.GetActiveForUserAsync(userId, cancellationToken);

        var importedProducts = new List<CatalogProduct>();

        foreach (var connection in connections)
        {
            try
            {
                var refreshed = await RefreshAccessTokenAsync(userId, connection.EtsyShopId, cancellationToken);
                _logger.LogInformation("Fetching Etsy active listings for Shop: {ShopName}", refreshed.EtsyShopName);

                var credentials = new EtsyCredentials(refreshed.ApiKeyKeystring, refreshed.ApiKeySharedSecret, refreshed.AccessToken);
                var listingsContainer = await _apiClient.GetActiveListingsAsync(refreshed.EtsyShopId, credentials, cancellationToken);

                if (listingsContainer?.Results != null && listingsContainer.Results.Any())
                {
                    var existingProducts = await _context.CatalogProducts
                        .Where(p => p.SellerId == userId)
                        .ToListAsync(cancellationToken);

                    foreach (var etsyListing in listingsContainer.Results)
                    {
                        var sku = await _apiClient.GetListingSkuAsync(etsyListing.ListingId, credentials, cancellationToken);
                        var targetProductCode = !string.IsNullOrEmpty(sku) ? sku : $"etsy-{etsyListing.ListingId}";

                        var existingProduct = existingProducts.FirstOrDefault(p =>
                            (p.Extras != null && p.Extras.TryGetValue("etsy_listing_id", out var val) && val.Value == etsyListing.ListingId.ToString()) ||
                            p.ProductCode == $"etsy-{etsyListing.ListingId}" ||
                            p.ProductCode == targetProductCode);

                        if (existingProduct != null)
                        {
                            existingProduct.ProductCode = targetProductCode;
                            existingProduct.Text = etsyListing.Title;

                            // Görsel boşsa veya hatalı formatta (data:image içermiyorsa) yeniden çekip güncelle
                            if (string.IsNullOrEmpty(existingProduct.Image) || !existingProduct.Image.StartsWith("data:image"))
                            {
                                var updatedBase64Image = await _apiClient.GetListingImageAsBase64Async(etsyListing.ListingId.ToString(), credentials, cancellationToken);
                                if (!string.IsNullOrEmpty(updatedBase64Image))
                                {
                                    existingProduct.Image = updatedBase64Image;
                                }
                            }

                            existingProduct.Extras ??= new Dictionary<string, ExtraValue>();
                            existingProduct.Extras["etsy_listing_id"] = new ExtraValue
                            {
                                Name = "Etsy Listing ID",
                                Type = "text",
                                Value = etsyListing.ListingId.ToString()
                            };

                            _context.CatalogProducts.Update(existingProduct);
                            importedProducts.Add(existingProduct);
                            continue;
                        }

                        var base64Image = await _apiClient.GetListingImageAsBase64Async(etsyListing.ListingId.ToString(), credentials, cancellationToken);

                        var newProduct = new CatalogProduct
                        {
                            Id = Guid.NewGuid().ToString(),
                            SellerId = userId,
                            ProductCode = targetProductCode,
                            Image = base64Image,
                            Text = etsyListing.Title,
                            CreatedAt = DateTime.UtcNow.ToString("o"),
                            Extras = new Dictionary<string, ExtraValue>
                            {
                                { "etsy_listing_id", new ExtraValue { Name = "Etsy Listing ID", Type = "text", Value = etsyListing.ListingId.ToString() } }
                            }
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

        var credentials = new EtsyCredentials(connection.ApiKeyKeystring, connection.ApiKeySharedSecret, connection.AccessToken);
        var receipt = await _apiClient.GetReceiptAsync(shopId, receiptId, credentials, cancellationToken);

        if (receipt == null || receipt.Transactions == null || !receipt.Transactions.Any())
        {
            _logger.LogWarning("Etsy receipt has no transactions to sync. ReceiptId: {ReceiptId}", receiptId);
            return;
        }

        var sellerUser = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);
        var sellerUsername = sellerUser?.Username ?? "Etsy Satıcı";

        foreach (var transaction in receipt.Transactions)
        {
            // Kataloğumuzda bu ürünü bul (SKU veya listing_id fallback ile)
            var catalogProduct = await _context.CatalogProducts
                .FirstOrDefaultAsync(p => p.SellerId == userId && (
                    (!string.IsNullOrEmpty(transaction.Sku) && p.ProductCode == transaction.Sku) ||
                    p.ProductCode == $"etsy-{transaction.ListingId}"
                ), cancellationToken);

            if (catalogProduct == null)
            {
                _logger.LogWarning("Etsy listing not found in catalog. ListingId: {ListingId}. Order cannot be auto-assigned.", transaction.ListingId);
                continue;
            }

            if (string.IsNullOrEmpty(catalogProduct.ManufacturerId))
            {
                _logger.LogWarning("Catalog product {ProductCode} has no manufacturer assigned. Skipping order creation.", catalogProduct.ProductCode);
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
        var connections = await _connectionRepository.GetActiveForUserAsync(userId, cancellationToken);

        foreach (var connection in connections)
        {
            try
            {
                var refreshed = await RefreshAccessTokenAsync(userId, connection.EtsyShopId, cancellationToken);
                _logger.LogInformation("Syncing recent Etsy orders for Shop: {ShopName}", refreshed.EtsyShopName);

                var credentials = new EtsyCredentials(refreshed.ApiKeyKeystring, refreshed.ApiKeySharedSecret, refreshed.AccessToken);
                var receiptsContainer = await _apiClient.GetPaidReceiptsAsync(refreshed.EtsyShopId, credentials, 20, cancellationToken);

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
}
