using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace GoodTrack.API.DTOs.Etsy;

// Etsy Open API v3 yanıtlarının deserialize edildiği modeller.
// Daha önce EtsyService içinde inner class olarak duruyordu; typed API client
// ve servis katmanının paylaşabilmesi için buraya taşındı.

public sealed class EtsyTokenResponse
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

public sealed class EtsyShopResult
{
    [JsonPropertyName("shop_id")]
    public long ShopId { get; set; }

    [JsonPropertyName("shop_name")]
    public string ShopName { get; set; } = string.Empty;
}

public sealed class EtsyListingsContainer
{
    [JsonPropertyName("count")]
    public int Count { get; set; }

    [JsonPropertyName("results")]
    public List<EtsyListingResult>? Results { get; set; }
}

public sealed class EtsyListingResult
{
    [JsonPropertyName("listing_id")]
    public long ListingId { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    // listings/batch?includes=Images ile gömülü gelen görsel ilişkisi
    // (listings/active bunları döndürmez; N+1'i önlemek için batch kullanılır).
    // Inventory artık includes enum'ında desteklenmiyor; SKU bilgisi
    // GET /v3/application/listings/batch/inventory ile ayrıca çekilir.

    [JsonPropertyName("images")]
    public List<EtsyListingImageResult>? Images { get; set; }
}

public sealed class EtsyListingImagesContainer
{
    [JsonPropertyName("results")]
    public List<EtsyListingImageResult>? Results { get; set; }
}

public sealed class EtsyListingImageResult
{
    [JsonPropertyName("url_570xN")]
    public string Url570xN { get; set; } = string.Empty;
}

public sealed class EtsyReceiptsContainer
{
    [JsonPropertyName("results")]
    public List<EtsyReceipt>? Results { get; set; }
}

public sealed class EtsyReceipt
{
    [JsonPropertyName("receipt_id")]
    public long ReceiptId { get; set; }

    [JsonPropertyName("shop_id")]
    public long ShopId { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

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

public sealed class EtsyTransaction
{
    [JsonPropertyName("transaction_id")]
    public long TransactionId { get; set; }

    [JsonPropertyName("listing_id")]
    public long ListingId { get; set; }

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("sku")]
    public string? Sku { get; set; }

    [JsonPropertyName("variations")]
    public List<EtsyTransactionVariation>? Variations { get; set; }

    [JsonPropertyName("personalization")]
    public string? Personalization { get; set; }
}

public sealed class EtsyTransactionVariation
{
    [JsonPropertyName("formatted_name")]
    public string FormattedName { get; set; } = string.Empty;

    [JsonPropertyName("formatted_value")]
    public string FormattedValue { get; set; } = string.Empty;
}

public sealed class EtsyInventoryContainer
{
    [JsonPropertyName("products")]
    public List<EtsyInventoryProduct>? Products { get; set; }
}

public sealed class EtsyInventoryProduct
{
    [JsonPropertyName("sku")]
    public string? Sku { get; set; }
}

/// <summary>
/// GET /v3/application/listings/batch/inventory yanıtındaki tek listing kaydı.
/// Etsy, Inventory'yi includes enum'ından kaldırdığı için SKU bilgisi
/// artık bu ayrık endpoint üzerinden çekilir.
/// </summary>
public sealed class EtsyBatchInventoryResult
{
    [JsonPropertyName("listing_id")]
    public long ListingId { get; set; }

    [JsonPropertyName("products")]
    public List<EtsyInventoryProduct>? Products { get; set; }
}

public sealed class EtsyBatchInventoryContainer
{
    [JsonPropertyName("results")]
    public List<EtsyBatchInventoryResult>? Results { get; set; }
}
