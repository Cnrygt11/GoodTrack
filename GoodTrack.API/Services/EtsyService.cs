using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.DTOs.Etsy;
using GoodTrack.API.DTOs.Product;
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
    private readonly IEtsyApiClient _apiClient;
    private readonly IEtsyOAuthService _oauthService;
    private readonly IEtsyConnectionRepository _connectionRepository;
    private readonly ICatalogRepository _catalogRepository;
    private readonly IProductRepository _productRepository;
    private readonly IUserRepository _userRepository;
    private readonly IProductService _productService;
    private readonly IOrderWorkflowService _orderWorkflowService;
    private readonly ILogger<EtsyService> _logger;

    public EtsyService(
        IEtsyApiClient apiClient,
        IEtsyOAuthService oauthService,
        IEtsyConnectionRepository connectionRepository,
        ICatalogRepository catalogRepository,
        IProductRepository productRepository,
        IUserRepository userRepository,
        IProductService productService,
        IOrderWorkflowService orderWorkflowService,
        ILogger<EtsyService> logger)
    {
        _apiClient = apiClient;
        _oauthService = oauthService;
        _connectionRepository = connectionRepository;
        _catalogRepository = catalogRepository;
        _productRepository = productRepository;
        _userRepository = userRepository;
        _productService = productService;
        _orderWorkflowService = orderWorkflowService;
        _logger = logger;
    }

    public Task<string> GenerateOAuthUrlAsync(string userId, string keystring, string callbackUrl, string frontendUrl, CancellationToken cancellationToken = default)
    {
        return _oauthService.GenerateOAuthUrlAsync(userId, keystring, callbackUrl, frontendUrl, cancellationToken);
    }

    public Task<PendingConnectionState?> ConsumeOAuthStateAsync(string state, CancellationToken cancellationToken = default)
    {
        return _oauthService.ConsumePendingConnectionAsync(state, cancellationToken);
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

    public async Task<bool> UpdateWebhookSecretAsync(string userId, string shopId, string? webhookSigningSecret, CancellationToken cancellationToken = default)
    {
        var connection = await _connectionRepository.GetAsync(userId, shopId, cancellationToken);
        if (connection == null)
        {
            return false;
        }

        connection.WebhookSigningSecret = webhookSigningSecret;
        await _connectionRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task DisconnectShopAsync(string userId, string shopId, CancellationToken cancellationToken = default)
    {
        var connection = await _connectionRepository.GetAsync(userId, shopId, cancellationToken);
        if (connection == null)
        {
            // İdempotent: bağlantı zaten yoksa istek başarılı sayılır.
            return;
        }

        _connectionRepository.Remove(connection);
        await _connectionRepository.SaveChangesAsync(cancellationToken);
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

                var credentials = EtsyCredentials.FromConnection(refreshed);
                var listingsContainer = await _apiClient.GetActiveListingsAsync(refreshed.EtsyShopId, credentials, cancellationToken);

                var activeIds = listingsContainer?.Results?.Select(r => r.ListingId).ToList();
                if (activeIds != null && activeIds.Count > 0)
                {
                    // Görsel + SKU'yu listing başına ayrı ayrı çekmek yerine (N+1), 100'erlik
                    // gruplar halinde tek batch çağrısıyla gömülü (Images + Inventory) getir.
                    var detailedListings = new List<DTOs.Etsy.EtsyListingResult>();
                    foreach (var chunk in activeIds.Chunk(100))
                    {
                        var batch = await _apiClient.GetListingsBatchAsync(chunk, credentials, cancellationToken);
                        if (batch?.Results != null)
                        {
                            detailedListings.AddRange(batch.Results);
                        }
                    }

                    var existingProducts = await _catalogRepository.GetAllBySellerAsync(userId, cancellationToken);
                    var index = CatalogMatchIndex.Build(existingProducts);

                    foreach (var etsyListing in detailedListings)
                    {
                        var sku = etsyListing.Inventory?.Products?.FirstOrDefault()?.Sku;
                        var targetProductCode = !string.IsNullOrEmpty(sku) ? sku : $"etsy-{etsyListing.ListingId}";
                        var imageUrl = etsyListing.Images?.FirstOrDefault()?.Url570xN;

                        var existingProduct = index.Find(etsyListing.ListingId, targetProductCode);

                        if (existingProduct != null)
                        {
                            existingProduct.ProductCode = targetProductCode;
                            existingProduct.Text = etsyListing.Title;

                            // Görseli indirip base64 olarak saklamak yerine doğrudan Etsy CDN URL'sini
                            // tutuyoruz: DB yükü ~0 ve kopya barındırmadığımız için Etsy Terms açısından
                            // da daha uygun. Listing görseli değişmiş olabileceğinden her senkronda güncel
                            // URL'yi yansıtırız (indirme maliyeti yok).
                            if (!string.IsNullOrEmpty(imageUrl))
                            {
                                existingProduct.Image = imageUrl;
                                // Etsy görseli zaten CDN URL; thumbnail olarak da aynı URL kullanılır.
                                existingProduct.ThumbnailImage = imageUrl;
                            }

                            existingProduct.Extras ??= new Dictionary<string, ExtraValue>();
                            existingProduct.Extras["etsy_listing_id"] = new ExtraValue
                            {
                                Name = "Etsy Listing ID",
                                Type = "text",
                                Value = etsyListing.ListingId.ToString()
                            };

                            // Entity izlenen sorgudan geldi; mutasyonlar SaveChangesAsync ile kalıcılaşır.
                            importedProducts.Add(existingProduct);
                            continue;
                        }

                        var newProduct = new CatalogProduct
                        {
                            Id = Guid.NewGuid().ToString(),
                            SellerId = userId,
                            ProductCode = targetProductCode,
                            Image = imageUrl ?? string.Empty,
                            ThumbnailImage = imageUrl,
                            Text = etsyListing.Title,
                            CreatedAt = DateTime.UtcNow.ToString("o"),
                            Extras = new Dictionary<string, ExtraValue>
                            {
                                { "etsy_listing_id", new ExtraValue { Name = "Etsy Listing ID", Type = "text", Value = etsyListing.ListingId.ToString() } }
                            }
                        };

                        await _catalogRepository.AddAsync(newProduct, cancellationToken);
                        importedProducts.Add(newProduct);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to import listings for shop {ShopId}", connection.EtsyShopId);
            }
        }

        await _catalogRepository.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Imported/Updated {Count} Etsy active listings into Catalog for User {UserId}", importedProducts.Count, userId);

        return importedProducts;
    }

    public async Task<EtsyOrderSyncResult> ProcessEtsyOrderSyncAsync(string userId, string shopId, string receiptId, CancellationToken cancellationToken = default)
    {
        var result = new EtsyOrderSyncResult();
        var connection = await RefreshAccessTokenAsync(userId, shopId, cancellationToken);

        _logger.LogInformation("Processing Etsy order sync. ReceiptId: {ReceiptId}", receiptId);

        var credentials = EtsyCredentials.FromConnection(connection);
        var receipt = await _apiClient.GetReceiptAsync(shopId, receiptId, credentials, cancellationToken);

        if (receipt == null || receipt.Transactions == null || !receipt.Transactions.Any())
        {
            _logger.LogWarning("Etsy receipt has no transactions to sync. ReceiptId: {ReceiptId}", receiptId);
            return result;
        }

        var sellerUser = await _userRepository.GetByIdAsync(userId, cancellationToken);
        var sellerUsername = sellerUser?.Username ?? "Etsy Satıcı";

        foreach (var transaction in receipt.Transactions)
        {
            // Kataloğumuzda bu ürünü bul (SKU veya listing_id fallback ile)
            var catalogProduct = await _catalogRepository.FindBySkuOrEtsyListingAsync(
                userId, transaction.Sku, transaction.ListingId, cancellationToken);

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

            // Sipariş kodu = ürünün SKU'su (yoksa katalog ürün kodu).
            // Etsy kimliği Code'da değil, Product.EtsyReceiptId / EtsyTransactionId alanlarında tutulur.
            var orderCode = !string.IsNullOrWhiteSpace(transaction.Sku)
                ? transaction.Sku!
                : catalogProduct.ProductCode;

            // Duplicate önleme transaction bazlıdır: aynı receipt içinde aynı ürünün farklı ekstra
            // özelliklerle alınması Etsy'de ayrı transaction'lara bölünür → ayrı siparişler oluşur.
            // (transaction_id yoksa geriye dönük uyum için listing_id'ye düşülür.)
            var transactionKey = transaction.TransactionId != 0 ? transaction.TransactionId : transaction.ListingId;
            if (await _productRepository.ExistsByEtsyTransactionAsync(userId, transactionKey, cancellationToken))
            {
                _logger.LogInformation("Order for Etsy transaction {TransactionId} already exists. Skipping.", transactionKey);
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

            // NOT: Etsy sipariş no, müşteri adı ve adres artık 'extras' içinde DEĞİL.
            // Bunlar Product üzerinde ayrı alanlarda tutulur; müşteri adı/adresi üreticiye
            // gönderilen yanıtlarda gizlenir. Extras yalnızca üretim için gerekli bilgileri taşır.

            var createProductDto = new CreateProductDto
            {
                Code = orderCode,
                // Görsel kopyalanmaz: sipariş katalog ürününe referans verir, tam görsel
                // detayda katalogtan çözülür (thumbnail seçimi de CreateOrderAsync'te yapılır).
                Image = null,
                ThumbnailImage = null,
                CatalogProductId = catalogProduct.Id,
                Text = null, // Etsy listing başlığı sipariş kartında gereksiz gürültü yaratıyordu
                Length = catalogProduct.Length,
                Extras = extras,
                Quantity = transaction.Quantity < 1 ? 1 : transaction.Quantity,
                EtsyReceiptId = receipt.ReceiptId,
                EtsyTransactionId = transactionKey,
                CustomerName = receipt.Name,
                ShippingAddress = FormatAddress(receipt),
                ManufacturerId = catalogProduct.ManufacturerId,
                ManufacturerName = catalogProduct.ManufacturerName
            };

            // Kredi yetersizliği siparişi SESSİZCE kaybettirmez: sayaca yazılır ve kullanıcıya
            // bildirilir. Duplicate kontrolü idempotent olduğundan kredi yüklendikten sonraki
            // senkron aynı transaction'ları yeniden dener.
            try
            {
                await _productService.CreateOrderAsync(userId, sellerUsername, createProductDto);
                result.Created++;
                _logger.LogInformation(
                    "Created GoodTrack order {OrderCode} (Etsy receipt {ReceiptId}, transaction {TransactionId}) automatically from Etsy purchase.",
                    orderCode, receipt.ReceiptId, transactionKey);
            }
            catch (InsufficientCreditsException)
            {
                result.SkippedInsufficientCredits++;
                _logger.LogWarning(
                    "Etsy order skipped due to insufficient credits. Seller: {UserId}, Receipt: {ReceiptId}, Transaction: {TransactionId}",
                    userId, receipt.ReceiptId, transactionKey);
            }
        }

        return result;
    }

    /// <summary>
    /// Receipt adres alanlarını tek satıra birleştirir. Boş alanlar atlanır
    /// (aksi halde ", ," gibi bozuk çıktılar oluşuyordu).
    /// </summary>
    private static string FormatAddress(DTOs.Etsy.EtsyReceipt receipt)
    {
        var parts = new[]
        {
            $"{receipt.FirstLine} {receipt.SecondLine}".Trim(),
            receipt.City,
            receipt.State,
            receipt.Zip,
            receipt.CountryIso
        };

        return string.Join(", ", parts.Where(p => !string.IsNullOrWhiteSpace(p)));
    }

    /// <summary>
    /// Etsy'de iptal edilen bir siparişin (receipt) GoodTrack karşılığını işler. Üretim
    /// durumuna göre ya doğrudan iptal edilir ya da üreticiye iptal talebi gönderilir
    /// (bkz. <see cref="IOrderWorkflowService.ApplyExternalCancellationAsync"/>).
    /// İlgili receipt'e ait siparişler <see cref="Product.EtsyReceiptId"/> üzerinden bulunur;
    /// Etsy API'sine tekrar gitmeye gerek yoktur.
    /// </summary>
    public async Task ProcessEtsyOrderCancellationAsync(string userId, string shopId, string receiptId, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Processing Etsy order cancellation. ReceiptId: {ReceiptId}", receiptId);

        if (!long.TryParse(receiptId, out var receiptIdValue))
        {
            _logger.LogError("Invalid Etsy receipt id '{ReceiptId}' in cancellation request. Ignoring.", receiptId);
            return;
        }

        var orderIds = await _productRepository.GetIdsByEtsyReceiptAsync(userId, receiptIdValue, cancellationToken);

        if (orderIds.Count == 0)
        {
            _logger.LogWarning("No GoodTrack orders found for canceled Etsy receipt {ReceiptId}. Nothing to cancel.", receiptId);
            return;
        }

        foreach (var orderId in orderIds)
        {
            try
            {
                var outcome = await _orderWorkflowService.ApplyExternalCancellationAsync(
                    userId, orderId, "Sipariş Etsy üzerinde iptal edildi.");
                _logger.LogInformation("Applied Etsy cancellation to GoodTrack order {OrderId} (receipt {ReceiptId}). Outcome: {Outcome}", orderId, receiptId, outcome);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to apply Etsy cancellation to GoodTrack order {OrderId} for receipt {ReceiptId}.", orderId, receiptId);
            }
        }
    }

    public async Task<EtsyOrderSyncResult> SyncRecentOrdersAsync(string userId, CancellationToken cancellationToken = default)
    {
        var total = new EtsyOrderSyncResult();
        var connections = await _connectionRepository.GetActiveForUserAsync(userId, cancellationToken);

        foreach (var connection in connections)
        {
            try
            {
                var refreshed = await RefreshAccessTokenAsync(userId, connection.EtsyShopId, cancellationToken);
                _logger.LogInformation("Syncing recent Etsy orders for Shop: {ShopName}", refreshed.EtsyShopName);

                var credentials = EtsyCredentials.FromConnection(refreshed);
                var receiptsContainer = await _apiClient.GetPaidReceiptsAsync(refreshed.EtsyShopId, credentials, 20, cancellationToken);

                if (receiptsContainer?.Results != null && receiptsContainer.Results.Any())
                {
                    foreach (var receipt in receiptsContainer.Results)
                    {
                        try
                        {
                            var result = await ProcessEtsyOrderSyncAsync(userId, refreshed.EtsyShopId, receipt.ReceiptId.ToString(), cancellationToken);
                            total.Add(result);
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

        return total;
    }
}
