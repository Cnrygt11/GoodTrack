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
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.Infrastructure;

namespace GoodTrack.API.Services;

public sealed class ProductService : IProductService
{
    private readonly IProductRepository _productRepository;
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
        _userRepository = userRepository;
        _userConnectionRepository = userConnectionRepository;
        _notificationService = notificationService;
        _imageStorageService = imageStorageService;
        _imageCleanupService = imageCleanupService;
        _creditsService = creditsService;
        _context = context;
        _logger = logger;
    }

    private const int MaxImageBase64Length = 7_000_000;

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

    public async Task<ProductResponseDto> CreateOrderAsync(string sellerId, string sellerName, CreateProductDto dto, CancellationToken cancellationToken = default)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Code))
        {
            throw new ArgumentException("Geçersiz ürün verisi veya eksik ürün kodu!");
        }

        if (string.IsNullOrWhiteSpace(dto.ManufacturerId))
        {
            throw new ArgumentException("Lütfen siparişin gönderileceği üreticiyi (Manufacturer) seçin!");
        }

        await ValidateManufacturerAsync(sellerId, dto.ManufacturerId, cancellationToken);

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

        await SafeNotifyUsersAsync(new[] { order.ManufacturerId, sellerId }, "ReceiveOrderUpdate");

        return MapToResponseDto(order);
    }

    public async Task<ProductResponseDto> UpdateProductAsync(string sellerId, string orderId, UpdateProductDto dto, CancellationToken cancellationToken = default)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Code))
        {
            throw new ArgumentException("Geçersiz ürün verisi veya eksik ürün kodu!");
        }

        if (string.IsNullOrWhiteSpace(dto.ManufacturerId))
        {
            throw new ArgumentException("Lütfen siparişin gönderileceği üreticiyi (Manufacturer) seçin!");
        }

        await ValidateManufacturerAsync(sellerId, dto.ManufacturerId, cancellationToken);

        var existing = await _productRepository.GetByIdAsync(orderId, cancellationToken);
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
                await _imageCleanupService.DeleteOrderImageIfUnusedAsync(oldImage, sellerId, orderId);
            }
            else if (string.IsNullOrEmpty(newImage))
            {
                existing.Image = null;
                await _imageCleanupService.DeleteOrderImageIfUnusedAsync(oldImage, sellerId, orderId);
            }
            else
            {
                existing.Image = newImage;
                if (oldImage != newImage)
                {
                    await _imageCleanupService.DeleteOrderImageIfUnusedAsync(oldImage, sellerId, orderId);
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

    public async Task DeleteProductAsync(string sellerId, string orderId, CancellationToken cancellationToken = default)
    {
        var existing = await _productRepository.GetByIdAsync(orderId, cancellationToken);
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

        await SafeNotifyUsersAsync(new[] { mfrId, sellerId }, "ReceiveOrderUpdate");
    }

    public async Task<ProductResponseDto?> GetProductByIdAsync(string userId, string role, string orderId, CancellationToken cancellationToken = default)
    {
        var product = await _productRepository.GetByIdAsync(orderId, cancellationToken);
        if (product == null) return null;

        if (role == Roles.Seller && product.SellerId != userId) return null;
        if (role == Roles.Mfr && product.ManufacturerId != userId) return null;

        return MapToResponseDto(product);
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

    private Task SafeNotifyUsersAsync(IReadOnlyList<string> userIds, string method)
    {
        // NotifyUsersAsync bildirim hatalarını kendi içinde yutar; ana akışı bozmaz.
        return _notificationService.NotifyUsersAsync(userIds, method);
    }
}
