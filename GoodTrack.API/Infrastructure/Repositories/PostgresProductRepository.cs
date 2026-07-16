using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Models;
using GoodTrack.API.Constants;
using GoodTrack.API.DTOs.Product;

namespace GoodTrack.API.Infrastructure.Repositories;

public sealed class PostgresProductRepository : IProductRepository
{
    private readonly AppDbContext _context;

    public PostgresProductRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Product?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        return await _context.Products.FindAsync(new object?[] { id }, cancellationToken);
    }

    public async Task<bool> IsImageUsedBySellerAsync(string sellerId, string imageUrl, string? excludeProductId, CancellationToken cancellationToken = default)
    {
        return await _context.Products
            .AsNoTracking()
            .AnyAsync(p => p.SellerId == sellerId
                && p.Image == imageUrl
                && (excludeProductId == null || p.Id != excludeProductId), cancellationToken);
    }

    public async Task<bool> IsDefectImageUsedBySellerAsync(string sellerId, string imageUrl, string excludeProductId, CancellationToken cancellationToken = default)
    {
        return await _context.Products
            .AsNoTracking()
            .AnyAsync(p => p.SellerId == sellerId
                && p.Id != excludeProductId
                && p.DefectImage == imageUrl, cancellationToken);
    }

    /// <summary>
    /// Liste projeksiyonu: tam <c>Image</c> null bırakılır (DB'den çekilmez), yalnız <c>ThumbnailImage</c>
    /// taşınır. Diğer tüm alanlar (müşteri bilgisi dahil; maskeleme serviste) döner.
    /// </summary>
    private static readonly Expression<Func<Product, ProductResponseDto>> SummaryProjection = p => new ProductResponseDto
    {
        Id = p.Id,
        Code = p.Code,
        Image = null,
        // Thumbnail varsa onu, yoksa tam görsele düşerek taşı (eski kayıtlar/kırık görsel olmaz).
        // Yeni yüklemeler gerçek küçük thumbnail gönderdiğinden liste yükü progresif azalır.
        ThumbnailImage = p.ThumbnailImage != null ? p.ThumbnailImage : p.Image,
        CatalogProductId = p.CatalogProductId,
        Text = p.Text,
        Length = p.Length,
        Extras = p.Extras,
        Quantity = p.Quantity,
        Completed = p.Completed,
        IsDefective = p.IsDefective,
        IsPendingApproval = p.IsPendingApproval,
        IsReproduction = p.IsReproduction,
        DefectNote = p.DefectNote,
        // Kusur görseli 7MB'a varan base64 olabilir; liste yalnız varlık bayrağını taşır,
        // tam görsel detay yanıtından (GetByIdAsync yolu) gelir.
        DefectImage = null,
        HasDefectImage = p.DefectImage != null,
        Status = p.Status,
        Logs = p.Logs,
        CreatedAt = p.CreatedAt,
        CompletedAt = p.CompletedAt,
        ArchivedAt = p.ArchivedAt,
        SlimmedAt = p.SlimmedAt,
        SellerId = p.SellerId,
        ManufacturerId = p.ManufacturerId,
        SellerName = p.SellerName,
        ManufacturerName = p.ManufacturerName,
        CancelRequested = p.CancelRequested,
        EtsyReceiptId = p.EtsyReceiptId,
        CustomerName = p.CustomerName,
        ShippingAddress = p.ShippingAddress,
        IsReadBySeller = p.IsReadBySeller,
        IsReadByMfr = p.IsReadByMfr,
    };

    public async Task<List<ProductResponseDto>> GetProductSummariesBySellerAsync(string sellerId, CancellationToken cancellationToken = default)
    {
        // Ana liste yalnız aktif akışı taşır; arşivlenmiş (kargolandı/iptal) siparişler
        // ayrı sayfalı arşiv sorgusundan döner (GetArchivedSummariesPageAsync).
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.SellerId == sellerId && p.ArchivedAt == null)
            .Select(SummaryProjection)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<ProductResponseDto>> GetProductSummariesByManufacturerAsync(string mfrId, CancellationToken cancellationToken = default)
    {
        // Üretici için to_ship terminal sayılır: satıcı "doğru" dediğinde sipariş
        // üreticinin aktif listesinden düşer ve arşive geçer.
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.ManufacturerId == mfrId && p.ArchivedAt == null && p.Status != OrderStatus.ToShip)
            .Select(SummaryProjection)
            .ToListAsync(cancellationToken);
    }

    public async Task<(List<ProductResponseDto> Items, int TotalCount)> GetArchivedSummariesPageAsync(
        string userId, bool asSeller, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        IQueryable<Product> query;

        if (asSeller)
        {
            // Satıcı arşivi: yalnız ArchivedAt set edilmiş (shipped/cancelled) siparişler.
            query = _context.Products.AsNoTracking()
                .Where(p => p.SellerId == userId && p.ArchivedAt != null);
        }
        else
        {
            // Üretici arşivi: ArchivedAt set edilmiş VEYA to_ship statüsündeki siparişler.
            // to_ship üretici için terminal sayılır ancak ArchivedAt henüz null'dur
            // (satıcı kargolayana kadar set edilmez).
            query = _context.Products.AsNoTracking()
                .Where(p => p.ManufacturerId == userId &&
                    (p.ArchivedAt != null || p.Status == OrderStatus.ToShip));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(p => p.ArchivedAt ?? p.CreatedAt) // to_ship'lerde ArchivedAt null; CreatedAt'e düş.
            .ThenByDescending(p => p.Id) // Aynı andaki kayıtlar için deterministik sıra.
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(SummaryProjection)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task SaveAsync(Product product, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(product.Id))
        {
            product.Id = Guid.NewGuid().ToString();
            await _context.Products.AddAsync(product, cancellationToken);
        }
        else
        {
            _context.Products.Update(product);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        var product = await _context.Products.FindAsync(new object?[] { id }, cancellationToken);
        if (product != null)
        {
            _context.Products.Remove(product);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task MarkProductsAsReadAsync(string userId, string role, string status, CancellationToken cancellationToken = default)
    {
        var query = _context.Products.AsQueryable();

        // 1. Filter by role ownership
        if (role == Roles.Seller)
        {
            query = query.Where(p => p.SellerId == userId && !p.IsReadBySeller);
        }
        else
        {
            query = query.Where(p => p.ManufacturerId == userId && !p.IsReadByMfr);
        }

        // 2. Filter by status buckets (matching MarkStatusAsReadAsync logic in ProductService)
        if (status.Equals("defective", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(p => p.Status == OrderStatus.Defective || p.Status == OrderStatus.Missing);
        }
        else if (status.Equals("shipped", StringComparison.OrdinalIgnoreCase))
        {
            if (role == Roles.Mfr)
            {
                query = query.Where(p => p.Status == OrderStatus.Shipped || p.Status == OrderStatus.Cancelled || p.Status == OrderStatus.ToShip);
            }
            else
            {
                query = query.Where(p => p.Status == OrderStatus.Shipped || p.Status == OrderStatus.Cancelled);
            }
        }
        else if (status.Equals("awaiting", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(p => p.Status == OrderStatus.Awaiting || p.Status == OrderStatus.Corrected);
        }
        else
        {
            query = query.Where(p => p.Status == status);
        }

        // 3. Execute bulk update
        if (role == Roles.Seller)
        {
            await query.ExecuteUpdateAsync(setters => setters.SetProperty(p => p.IsReadBySeller, true), cancellationToken);
        }
        else
        {
            await query.ExecuteUpdateAsync(setters => setters.SetProperty(p => p.IsReadByMfr, true), cancellationToken);
        }
    }

    public async Task<int> SlimOrdersArchivedBeforeAsync(DateTime cutoffUtc, CancellationToken cancellationToken = default)
    {
        // "Başkalaşım": ağır alanlar (base64 görseller, katalog referansı) ve müşteri PII'ı
        // (ad, adres) kalıcı temizlenir; satır minimum veriyle arşivde görünmeye devam eder.
        // ExecuteUpdate ile ağır base64 belleğe yüklenmeden doğrudan DB'de boşaltılır.
        return await _context.Products
            .Where(p => p.ArchivedAt != null && p.ArchivedAt < cutoffUtc && p.SlimmedAt == null)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(p => p.Image, (string?)null)
                .SetProperty(p => p.ThumbnailImage, (string?)null)
                .SetProperty(p => p.DefectImage, (string?)null)
                .SetProperty(p => p.CatalogProductId, (string?)null)
                .SetProperty(p => p.CustomerName, (string?)null)
                .SetProperty(p => p.ShippingAddress, (string?)null)
                .SetProperty(p => p.SlimmedAt, DateTime.UtcNow), cancellationToken);
    }
}
