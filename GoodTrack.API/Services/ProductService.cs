using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Models;
using GoodTrack.API.Hubs;
using GoodTrack.API.Constants;
using GoodTrack.API.DTOs.Auth;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.Infrastructure;

namespace GoodTrack.API.Services;

public sealed class ProductService : IProductService
{
    private readonly IProductRepository _productRepository;
    private readonly ICatalogRepository _catalogRepository;
    private readonly IUserRepository _userRepository;
    private readonly IUserConnectionRepository _userConnectionRepository;
    private readonly INotificationService _notificationService;
    private readonly IImageStorageService _imageStorageService;
    private readonly IImageCleanupService _imageCleanupService;
    private readonly ICreditsService _creditsService;
    private readonly AppDbContext _context;
    private readonly ILogger<ProductService> _logger;

    public ProductService(
        IProductRepository productRepository,
        ICatalogRepository catalogRepository,
        IUserRepository userRepository,
        IUserConnectionRepository userConnectionRepository,
        INotificationService notificationService,
        IImageStorageService imageStorageService,
        IImageCleanupService imageCleanupService,
        ICreditsService creditsService,
        AppDbContext context,
        ILogger<ProductService> logger)
    {
        _productRepository = productRepository;
        _catalogRepository = catalogRepository;
        _userRepository = userRepository;
        _userConnectionRepository = userConnectionRepository;
        _notificationService = notificationService;
        _imageStorageService = imageStorageService;
        _imageCleanupService = imageCleanupService;
        _creditsService = creditsService;
        _context = context;
        _logger = logger;
    }

    private async Task ValidateManufacturerAsync(string sellerId, string manufacturerId, CancellationToken cancellationToken = default)
    {
        var manufacturer = await _userRepository.GetByIdAsync(manufacturerId, cancellationToken);
        if (manufacturer == null || !manufacturer.Role.Equals(Roles.Mfr, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Seçilen üretici bulunamadı veya geçersiz.");
        }

        var isConnected = await _userConnectionRepository.AreConnectedAsync(sellerId, manufacturerId, cancellationToken);
        if (!isConnected)
        {
            throw new UnauthorizedAccessException("Yalnızca bağlantılı olduğunuz üreticilere sipariş gönderebilirsiniz.");
        }
    }

    private static void ValidateImageSize(string? base64Image, string fieldName = "Görsel")
        => ImageLimits.ValidateImageSize(base64Image, fieldName);

    /// <summary>
    /// Katalog görsel referansını doğrular: katalog ürünü var olmalı ve satıcıya ait olmalı.
    /// Döndürülen katalog ürünü thumbnail fallback'i için kullanılır.
    /// </summary>
    private async Task<CatalogProduct> ValidateCatalogReferenceAsync(string sellerId, string catalogProductId, CancellationToken cancellationToken = default)
    {
        var catalogProduct = await _catalogRepository.GetByIdAsync(catalogProductId, cancellationToken);
        if (catalogProduct == null || catalogProduct.SellerId != sellerId)
        {
            throw new ArgumentException("Referans verilen katalog ürünü bulunamadı.");
        }

        return catalogProduct;
    }

    /// <summary>
    /// Katalog referanslı sipariş için kart thumbnail'ini seçer: istemcinin gönderdiği thumbnail,
    /// yoksa katalogtaki thumbnail, o da yoksa katalog görseli URL ise (Etsy CDN) URL'in kendisi.
    /// Ağır base64 katalog görseli asla thumbnail olarak kopyalanmaz.
    /// </summary>
    private static string? ResolveCatalogThumbnail(string? dtoThumbnail, CatalogProduct catalogProduct)
    {
        if (!string.IsNullOrEmpty(dtoThumbnail)) return dtoThumbnail;
        if (!string.IsNullOrEmpty(catalogProduct.ThumbnailImage)) return catalogProduct.ThumbnailImage;
        if (!string.IsNullOrEmpty(catalogProduct.Image) && !catalogProduct.Image.StartsWith("data:")) return catalogProduct.Image;
        return null;
    }

    public async Task<List<ProductResponseDto>> GetUserProductsAsync(string userId, string role, CancellationToken cancellationToken = default)
    {
        // Liste hafif projeksiyonla gelir: tam Image DB'den çekilmez, yalnız ThumbnailImage taşınır.
        List<ProductResponseDto> products;
        if (role == Roles.Seller)
        {
            products = await _productRepository.GetProductSummariesBySellerAsync(userId, cancellationToken);
        }
        else if (role == Roles.Mfr)
        {
            products = await _productRepository.GetProductSummariesByManufacturerAsync(userId, cancellationToken);
        }
        else
        {
            throw new UnauthorizedAccessException(Messages.Auth.Forbidden);
        }

        MaskCustomerInfoForManufacturer(role, products);
        return products;
    }

    /// <summary>
    /// Üretici müşteri adı/adresi görmemeli — projeksiyonlar bu alanları taşır,
    /// üretici rolüne dönen tüm liste yanıtlarında burada maskelenir.
    /// </summary>
    private static void MaskCustomerInfoForManufacturer(string role, IEnumerable<ProductResponseDto> products)
    {
        if (role != Roles.Mfr) return;

        foreach (var p in products)
        {
            p.CustomerName = null;
            p.ShippingAddress = null;
        }
    }

    public async Task<PagedResultDto<ProductResponseDto>> GetArchivedProductsAsync(string userId, string role, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        if (role != Roles.Seller && role != Roles.Mfr)
        {
            throw new UnauthorizedAccessException(Messages.Auth.Forbidden);
        }

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var (items, totalCount) = await _productRepository.GetArchivedSummariesPageAsync(
            userId, asSeller: role == Roles.Seller, page, pageSize, cancellationToken);

        MaskCustomerInfoForManufacturer(role, items);

        return new PagedResultDto<ProductResponseDto>
        {
            Items = items,
            TotalCount = totalCount,
            HasMore = page * pageSize < totalCount,
        };
    }

    public async Task<ProductResponseDto> CreateOrderAsync(string sellerId, string sellerName, CreateProductDto dto, CancellationToken cancellationToken = default)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Code))
        {
            throw new ArgumentException(Messages.Order.InvalidProductData);
        }

        if (string.IsNullOrWhiteSpace(dto.ManufacturerId))
        {
            throw new ArgumentException(Messages.Order.ManufacturerRequired);
        }

        await ValidateManufacturerAsync(sellerId, dto.ManufacturerId, cancellationToken);

        // Katalog referansı: tam görsel siparişe kopyalanmaz, yalnız küçük thumbnail taşınır.
        // Tam görsel detay yanıtında katalogtan çözülür (bkz. GetProductByIdAsync).
        string? image = dto.Image;
        string? thumbnail = dto.ThumbnailImage;
        if (!string.IsNullOrWhiteSpace(dto.CatalogProductId))
        {
            var catalogProduct = await ValidateCatalogReferenceAsync(sellerId, dto.CatalogProductId, cancellationToken);
            image = null;
            thumbnail = ResolveCatalogThumbnail(dto.ThumbnailImage, catalogProduct);
        }

        var order = new Product
        {
            Code = dto.Code,
            Image = image,
            ThumbnailImage = thumbnail,
            CatalogProductId = string.IsNullOrWhiteSpace(dto.CatalogProductId) ? null : dto.CatalogProductId,
            Text = dto.Text,
            Length = dto.Length,
            Extras = dto.Extras,
            Quantity = dto.Quantity < 1 ? 1 : dto.Quantity,
            EtsyReceiptId = dto.EtsyReceiptId,
            EtsyTransactionId = dto.EtsyTransactionId,
            CustomerName = dto.CustomerName,
            ShippingAddress = dto.ShippingAddress,
            ManufacturerId = dto.ManufacturerId,
            ManufacturerName = dto.ManufacturerName,
            SellerId = sellerId,
            SellerName = sellerName,
            CreatedAt = DateTime.UtcNow,
            Status = OrderStatus.Awaiting,
            IsPendingApproval = true,
            Completed = false,
            IsDefective = false,
            IsReadBySeller = true,
            IsReadByMfr = false,
            Logs = new List<OrderLog>
            {
                new OrderLog
                {
                    Timestamp = DateTime.UtcNow.ToString("o"),
                    Status = OrderStatus.Awaiting,
                    Message = "Sipariş oluşturuldu ve üretici onayına gönderildi.",
                    UserId = sellerId,
                    UserName = sellerName
                }
            }
        };

        ValidateImageSize(order.Image, "Sipariş görseli");

        var originalId = order.Id;
        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                await _creditsService.DeductForOrderAsync(sellerId);
                order.Image = await _imageStorageService.StoreImageAsync(order.Image);
                await _productRepository.SaveAsync(order);
                await transaction.CommitAsync();
            }
            catch
            {
                _context.Entry(order).State = EntityState.Detached;
                order.Id = originalId;
                await transaction.RollbackAsync();
                throw;
            }
        });

        await _notificationService.NotifyUsersAsync(new[] { order.ManufacturerId, sellerId }, SignalRMethods.ReceiveOrderUpdate, order.Id);

        return MapToResponseDto(order);
    }

    public async Task<ProductResponseDto> UpdateProductAsync(string sellerId, string orderId, UpdateProductDto dto, CancellationToken cancellationToken = default)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Code))
        {
            throw new ArgumentException(Messages.Order.InvalidProductData);
        }

        if (string.IsNullOrWhiteSpace(dto.ManufacturerId))
        {
            throw new ArgumentException(Messages.Order.ManufacturerRequired);
        }

        await ValidateManufacturerAsync(sellerId, dto.ManufacturerId, cancellationToken);

        var existing = await _productRepository.GetByIdAsync(orderId, cancellationToken);
        if (existing == null)
        {
            throw new KeyNotFoundException(Messages.Order.NotFound);
        }

        if (existing.SellerId != sellerId)
        {
            throw new UnauthorizedAccessException("Bu siparişi düzenleme yetkiniz yok!");
        }

        string oldMfrId = existing.ManufacturerId;
        string newMfrId = dto.ManufacturerId;

        string? oldImage = existing.Image;
        string? newImage = dto.Image;

        if (!string.IsNullOrWhiteSpace(dto.CatalogProductId))
        {
            // Katalog referansı (korunuyor ya da yeni kuruluyor): tam görsel siparişte tutulmaz.
            var catalogProduct = await ValidateCatalogReferenceAsync(sellerId, dto.CatalogProductId, cancellationToken);
            existing.CatalogProductId = dto.CatalogProductId;
            existing.Image = null;
            existing.ThumbnailImage = ResolveCatalogThumbnail(dto.ThumbnailImage, catalogProduct);
            if (!string.IsNullOrEmpty(oldImage))
            {
                await _imageCleanupService.DeleteOrderImageIfUnusedAsync(oldImage, sellerId, orderId);
            }
        }
        else
        {
            bool hadCatalogReference = existing.CatalogProductId != null;
            existing.CatalogProductId = null;

            if (newImage != oldImage)
            {
                existing.Image = await _imageStorageService.ResolveUpdatedImageAsync(
                    oldImage, newImage, "Sipariş görseli",
                    old => _imageCleanupService.DeleteOrderImageIfUnusedAsync(old, sellerId, orderId));

                // Görsel değiştiğinde thumbnail'i de senkronize et: görsel silindiyse thumbnail de temizlenir.
                existing.ThumbnailImage = string.IsNullOrEmpty(newImage) ? null : dto.ThumbnailImage;
            }
            else if (hadCatalogReference && string.IsNullOrEmpty(newImage))
            {
                // Katalog referansı kaldırıldı ve yerine görsel konmadı: thumbnail da temizlenir.
                existing.ThumbnailImage = null;
            }
        }

        existing.Code = dto.Code;
        existing.Text = dto.Text;
        existing.Length = dto.Length;
        existing.Extras = dto.Extras;
        existing.ManufacturerId = newMfrId;
        existing.ManufacturerName = dto.ManufacturerName;

        if (existing.Status == OrderStatus.Broken)
        {
            existing.Status = OrderStatus.Corrected;
            existing.IsPendingApproval = true;
        }
        else if (string.IsNullOrEmpty(existing.Status))
        {
            existing.Status = OrderStatus.Awaiting;
            existing.IsPendingApproval = true;
        }

        existing.Logs ??= new List<OrderLog>();

        existing.Logs.Add(new OrderLog
        {
            Timestamp = DateTime.UtcNow.ToString("o"),
            Status = existing.Status,
            Message = existing.Status == OrderStatus.Corrected
                ? "Sipariş detayları satıcı tarafından düzeltildi ve tekrar gönderildi."
                : "Sipariş detayları satıcı tarafından güncellendi.",
            UserId = sellerId,
            UserName = existing.SellerName
        });

        existing.IsReadBySeller = true;
        existing.IsReadByMfr = false;
        await _productRepository.SaveAsync(existing);

        var usersToNotify = new List<string> { sellerId, newMfrId };
        if (oldMfrId != newMfrId)
        {
            usersToNotify.Add(oldMfrId);
        }
        await _notificationService.NotifyUsersAsync(usersToNotify, SignalRMethods.ReceiveOrderUpdate, existing.Id);

        return MapToResponseDto(existing);
    }

    public async Task DeleteProductAsync(string sellerId, string orderId, CancellationToken cancellationToken = default)
    {
        var existing = await _productRepository.GetByIdAsync(orderId, cancellationToken);
        if (existing == null)
        {
            throw new KeyNotFoundException(Messages.Order.NotFound);
        }

        if (existing.SellerId != sellerId)
        {
            throw new UnauthorizedAccessException("Bu siparişi silme yetkiniz yok!");
        }

        if (existing.Status != OrderStatus.Awaiting)
        {
            throw new BusinessRuleException("Sadece bekleyen listesindeki siparişleri silebilirsiniz!");
        }

        string mfrId = existing.ManufacturerId;
        string? image = existing.Image;
        string? defectImage = existing.DefectImage;

        // EF Core Database Transaction başlatılıyor
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            await _productRepository.DeleteAsync(orderId);
            await _creditsService.RefundCreditAsync(sellerId);

            // Adımlar başarılıysa commit et
            await transaction.CommitAsync();
        }
        catch (Exception)
        {
            // Adımlardan biri hata verirse tüm işlemleri geri al (Rollback)
            await transaction.RollbackAsync();
            throw;
        }

        await _imageCleanupService.DeleteOrderImageIfUnusedAsync(image, sellerId, orderId);
        await _imageCleanupService.DeleteDefectImageIfUnusedAsync(defectImage, sellerId, orderId);

        // Silme: id gönderilir; istemci getProductById 404 alıp kaydı cache'ten çıkarır.
        await _notificationService.NotifyUsersAsync(new[] { mfrId, sellerId }, SignalRMethods.ReceiveOrderUpdate, orderId);
    }

    public async Task<ProductResponseDto?> GetProductByIdAsync(string userId, string role, string orderId, CancellationToken cancellationToken = default)
    {
        var product = await _productRepository.GetByIdAsync(orderId, cancellationToken);
        if (product == null) return null;

        if (role == Roles.Seller && product.SellerId != userId) return null;
        if (role == Roles.Mfr && product.ManufacturerId != userId) return null;

        var response = MapToResponseDto(product, includeCustomerInfo: role != Roles.Mfr);

        // Katalog referanslı siparişte tam görsel satırda tutulmaz; detayda katalogtan çözülür.
        // Katalog ürünü silinmişse thumbnail ile devam edilir (görsel yoksa kart görseli kalır).
        if (response.Image == null && product.CatalogProductId != null)
        {
            var catalogProduct = await _catalogRepository.GetByIdAsync(product.CatalogProductId, cancellationToken);
            response.Image = catalogProduct?.Image;
        }

        return response;
    }

    public async Task MarkStatusAsReadAsync(string userId, string role, string status)
    {
        await _productRepository.MarkProductsAsReadAsync(userId, role, status);
    }

    /// <summary>Detay eşlemesinin tek kaynağı <see cref="ProductMappings.ToDetailDto"/>'dur.</summary>
    private static ProductResponseDto MapToResponseDto(Product product, bool includeCustomerInfo = true)
        => ProductMappings.ToDetailDto(product, includeCustomerInfo);

}
