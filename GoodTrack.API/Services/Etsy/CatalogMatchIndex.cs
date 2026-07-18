using System.Collections.Generic;
using GoodTrack.API.Models;

namespace GoodTrack.API.Services;

/// <summary>
/// Etsy içe aktarımında "bu listing kataloğumda zaten var mı?" sorusunu O(1) yanıtlayan indeks.
/// Eskiden her listing için tüm katalog listesi taranıyordu (O(listing × katalog)); satıcı
/// büyüdükçe senkron süresi karesel artıyordu.
///
/// Eşleşme önceliği, taranan listedeki SIRA ile belirlenir (eski doğrusal aramanın
/// FirstOrDefault davranışı birebir korunur): birden çok aday varsa katalogda önce gelen kazanır.
/// (Pratikte (SellerId, ProductCode) üzerindeki unique indeks çoklu adayı zaten engeller;
/// sıra kuralı yalnız davranış eşdeğerliği için vardır.)
/// </summary>
internal sealed class CatalogMatchIndex
{
    private const string EtsyListingIdField = "etsy_listing_id";

    /// <summary>Extras["etsy_listing_id"] değerine göre (listing id → katalogdaki ilk ürün).</summary>
    private readonly Dictionary<string, (int Order, CatalogProduct Product)> _byListingId = new();

    /// <summary>ProductCode'a göre (kod → katalogdaki ilk ürün).</summary>
    private readonly Dictionary<string, (int Order, CatalogProduct Product)> _byProductCode = new();

    public static CatalogMatchIndex Build(IReadOnlyList<CatalogProduct> products)
    {
        var index = new CatalogMatchIndex();

        for (var order = 0; order < products.Count; order++)
        {
            var product = products[order];

            if (product.Extras != null &&
                product.Extras.TryGetValue(EtsyListingIdField, out var listingIdValue) &&
                !string.IsNullOrEmpty(listingIdValue.Value))
            {
                index._byListingId.TryAdd(listingIdValue.Value, (order, product));
            }

            if (!string.IsNullOrEmpty(product.ProductCode))
            {
                index._byProductCode.TryAdd(product.ProductCode, (order, product));
            }
        }

        return index;
    }

    /// <summary>
    /// Listing için katalog karşılığını bulur: listing id etiketi, "etsy-{id}" fallback kodu
    /// veya hedef ürün kodu (SKU) üzerinden. Birden çok aday varsa katalogda önce gelen döner.
    /// </summary>
    public CatalogProduct? Find(long listingId, string targetProductCode)
    {
        (int Order, CatalogProduct Product)? best = null;

        void Consider((int Order, CatalogProduct Product) candidate)
        {
            if (best == null || candidate.Order < best.Value.Order)
            {
                best = candidate;
            }
        }

        if (_byListingId.TryGetValue(listingId.ToString(), out var byListing)) Consider(byListing);
        if (_byProductCode.TryGetValue($"etsy-{listingId}", out var byFallbackCode)) Consider(byFallbackCode);
        if (_byProductCode.TryGetValue(targetProductCode, out var byTargetCode)) Consider(byTargetCode);

        return best?.Product;
    }
}
