using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Models;
using GoodTrack.API.Hubs;
using GoodTrack.API.Constants;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.Infrastructure;

namespace GoodTrack.API.Services;

public class ProductService : IProductService
{
    private readonly IProductRepository _productRepository;
    private readonly ICatalogRepository _catalogRepository;
    private readonly IHubContext<TrackingHub> _hubContext;
    private readonly IImageStorageService _imageStorageService;
    private readonly ICreditsService _creditsService;
    private readonly AppDbContext _context;
    private readonly ILogger<ProductService> _logger;

    public ProductService(
        IProductRepository productRepository, 
        ICatalogRepository catalogRepository,
        IHubContext<TrackingHub> hubContext,
        IImageStorageService imageStorageService,
        ICreditsService creditsService,
        AppDbContext context,
        ILogger<ProductService> logger)
    {
        _productRepository = productRepository;
        _catalogRepository = catalogRepository;
        _hubContext = hubContext;
        _imageStorageService = imageStorageService;
        _creditsService = creditsService;
        _context = context;
        _logger = logger;
    }

    private const int MaxImageBase64Length = 7_000_000;

    private static void ValidateImageSize(string? base64Image, string fieldName = "Görsel")
    {
        if (!string.IsNullOrEmpty(base64Image) && base64Image.Length > MaxImageBase64Length)
        {
            throw new ArgumentException($"{fieldName} boyutu çok büyük! Maksimum 5MB desteklenmektedir.");
        }
    }

    public async Task<List<ProductResponseDto>> GetUserProductsAsync(string userId, string role, CancellationToken cancellationToken = default)
    {
        List<Product> products;
        if (role == Roles.Seller)
        {
            products = await _productRepository.GetProductsBySellerAsync(userId, cancellationToken);
        }
        else if (role == Roles.Mfr)
        {
            products = await _productRepository.GetProductsByManufacturerAsync(userId, cancellationToken);
        }
        else
        {
            throw new UnauthorizedAccessException("Bu işlem için yetkiniz yok.");
        }

        return products.Select(MapToResponseDto).ToList();
    }

    public async Task<ProductResponseDto> CreateOrderAsync(string sellerId, string sellerName, CreateProductDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Code))
        {
            throw new ArgumentException("Geçersiz ürün verisi veya eksik ürün kodu!");
        }

        if (string.IsNullOrWhiteSpace(dto.ManufacturerId))
        {
            throw new ArgumentException("Lütfen siparişin gönderileceği üreticiyi (Manufacturer) seçin!");
        }

        var order = new Product
        {
            Code = dto.Code,
            Image = dto.Image,
            Text = dto.Text,
            Length = dto.Length,
            Extras = dto.Extras,
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
            await transaction.RollbackAsync();
            throw;
        }

        await SafeNotifyUsersAsync(new[] { order.ManufacturerId, sellerId }, "ReceiveOrderUpdate");

        return MapToResponseDto(order);
    }

    public async Task<ProductResponseDto> UpdateProductAsync(string sellerId, string orderId, UpdateProductDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Code))
        {
            throw new ArgumentException("Geçersiz ürün verisi veya eksik ürün kodu!");
        }

        if (string.IsNullOrWhiteSpace(dto.ManufacturerId))
        {
            throw new ArgumentException("Lütfen siparişin gönderileceği üreticiyi (Manufacturer) seçin!");
        }

        var existing = await _productRepository.GetByIdAsync(orderId);
        if (existing == null)
        {
            throw new KeyNotFoundException("Sipariş bulunamadı!");
        }

        if (existing.SellerId != sellerId)
        {
            throw new UnauthorizedAccessException("Bu siparişi düzenleme yetkiniz yok!");
        }

        string oldMfrId = existing.ManufacturerId;
        string newMfrId = dto.ManufacturerId;

        string? oldImage = existing.Image;
        string? newImage = dto.Image;

        if (newImage != oldImage)
        {
            if (!string.IsNullOrEmpty(newImage) && newImage.StartsWith("data:image"))
            {
                ValidateImageSize(newImage, "Sipariş görseli");
                existing.Image = await _imageStorageService.StoreImageAsync(newImage);
                await TryDeleteImageAsync(oldImage, sellerId, orderId);
            }
            else if (string.IsNullOrEmpty(newImage))
            {
                existing.Image = null;
                await TryDeleteImageAsync(oldImage, sellerId, orderId);
            }
            else
            {
                existing.Image = newImage;
                if (oldImage != newImage)
                {
                    await TryDeleteImageAsync(oldImage, sellerId, orderId);
                }
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
        await SafeNotifyUsersAsync(usersToNotify, "ReceiveOrderUpdate");

        return MapToResponseDto(existing);
    }

    public async Task DeleteProductAsync(string sellerId, string orderId)
    {
        var existing = await _productRepository.GetByIdAsync(orderId);
        if (existing == null)
        {
            throw new KeyNotFoundException("Sipariş bulunamadı!");
        }

        if (existing.SellerId != sellerId)
        {
            throw new UnauthorizedAccessException("Bu siparişi silme yetkiniz yok!");
        }

        if (existing.Status != OrderStatus.Awaiting)
        {
            throw new InvalidOperationException("Sadece bekleyen listesindeki siparişleri silebilirsiniz!");
        }

        string mfrId = existing.ManufacturerId;
        string? image = existing.Image;
        string? defectImage = existing.DefectImage;

        await _productRepository.DeleteAsync(orderId);
        await _creditsService.RefundCreditAsync(sellerId);

        await TryDeleteImageAsync(image, sellerId, orderId);
        await TryDeleteDefectImageAsync(defectImage, sellerId, orderId);

        await SafeNotifyUsersAsync(new[] { mfrId, sellerId }, "ReceiveOrderUpdate");
    }

    private async Task TryDeleteImageAsync(string? imageUrl, string sellerId, string currentProductId)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return;

        if (imageUrl.StartsWith("data:image"))
        {
            await _imageStorageService.DeleteImageAsync(imageUrl);
            return;
        }

        var otherProducts = await _productRepository.GetProductsBySellerAsync(sellerId);
        bool isUsedInOthers = otherProducts.Exists(p => p.Id != currentProductId && p.Image == imageUrl);
        if (isUsedInOthers) return;

        var catalog = await _catalogRepository.GetCatalogBySellerAsync(sellerId);
        bool isUsedInCatalog = catalog.Exists(c => c.Image == imageUrl);
        if (isUsedInCatalog) return;

        await _imageStorageService.DeleteImageAsync(imageUrl);
    }

    private async Task TryDeleteDefectImageAsync(string? imageUrl, string sellerId, string currentProductId)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return;

        if (imageUrl.StartsWith("data:image"))
        {
            await _imageStorageService.DeleteImageAsync(imageUrl);
            return;
        }

        var otherProducts = await _productRepository.GetProductsBySellerAsync(sellerId);
        bool isUsedInOthers = otherProducts.Exists(p => p.Id != currentProductId && p.DefectImage == imageUrl);
        if (isUsedInOthers) return;

        bool isUsedAsMain = otherProducts.Exists(p => p.Image == imageUrl);
        if (isUsedAsMain) return;

        var catalog = await _catalogRepository.GetCatalogBySellerAsync(sellerId);
        bool isUsedInCatalog = catalog.Exists(c => c.Image == imageUrl);
        if (isUsedInCatalog) return;

        await _imageStorageService.DeleteImageAsync(imageUrl);
    }

    public async Task<ProductResponseDto?> GetProductByIdAsync(string userId, string role, string orderId, CancellationToken cancellationToken = default)
    {
        var product = await _productRepository.GetByIdAsync(orderId, cancellationToken);
        if (product == null) return null;

        if (role == Roles.Seller && product.SellerId != userId) return null;
        if (role == Roles.Mfr && product.ManufacturerId != userId) return null;

        return MapToResponseDto(product);
    }

    public async Task<int> MigrateProductStatusesAsync()
    {
        return await _productRepository.MigrateStatusesAsync();
    }

    public async Task MarkStatusAsReadAsync(string userId, string role, string status)
    {
        await _productRepository.MarkProductsAsReadAsync(userId, role, status);
    }

    private static ProductResponseDto MapToResponseDto(Product product)
    {
        return new ProductResponseDto
        {
            Id = product.Id,
            Code = product.Code,
            Image = product.Image,
            Text = product.Text,
            Length = product.Length,
            Extras = product.Extras,
            Completed = product.Completed,
            IsDefective = product.IsDefective,
            IsPendingApproval = product.IsPendingApproval,
            IsReproduction = product.IsReproduction,
            DefectNote = product.DefectNote,
            DefectImage = product.DefectImage,
            Status = product.Status,
            Logs = product.Logs,
            CreatedAt = product.CreatedAt,
            CompletedAt = product.CompletedAt,
            SellerId = product.SellerId,
            ManufacturerId = product.ManufacturerId,
            SellerName = product.SellerName,
            ManufacturerName = product.ManufacturerName,
            CancelRequested = product.CancelRequested,
            IsReadBySeller = product.IsReadBySeller,
            IsReadByMfr = product.IsReadByMfr
        };
    }

    private async Task SafeNotifyUsersAsync(IReadOnlyList<string> userIds, string method)
    {
        try
        {
            await _hubContext.Clients.Users(userIds).SendAsync(method);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SignalR notification '{Method}' failed for users: {UserIds}", method, string.Join(", ", userIds));
        }
    }
}
