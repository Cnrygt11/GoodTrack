using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Models;
using GoodTrack.API.Hubs;
using GoodTrack.API.Constants;

namespace GoodTrack.API.Services;

public class ProductService : IProductService
{
    private readonly IProductRepository _productRepository;
    private readonly ICatalogRepository _catalogRepository;
    private readonly IHubContext<TrackingHub> _hubContext;
    private readonly IImageStorageService _imageStorageService;
    private readonly ICreditsService _creditsService;

    public ProductService(
        IProductRepository productRepository, 
        ICatalogRepository catalogRepository,
        IHubContext<TrackingHub> hubContext,
        IImageStorageService imageStorageService,
        ICreditsService creditsService)
    {
        _productRepository = productRepository;
        _catalogRepository = catalogRepository;
        _hubContext = hubContext;
        _imageStorageService = imageStorageService;
        _creditsService = creditsService;
    }

    // ~5MB binary = ~6.8MB base64; we use 7_000_000 chars as the hard cap
    private const int MaxImageBase64Length = 7_000_000;

    private static void ValidateImageSize(string? base64Image, string fieldName = "Görsel")
    {
        if (!string.IsNullOrEmpty(base64Image) && base64Image.Length > MaxImageBase64Length)
        {
            throw new ArgumentException($"{fieldName} boyutu çok büyük! Maksimum 5MB desteklenmektedir.");
        }
    }

    public async Task<List<Product>> GetUserProductsAsync(string userId, string role, CancellationToken cancellationToken = default)
    {
        if (role == Roles.Seller)
        {
            return await _productRepository.GetProductsBySellerAsync(userId, cancellationToken);
        }
        else if (role == Roles.Mfr)
        {
            return await _productRepository.GetProductsByManufacturerAsync(userId, cancellationToken);
        }
        else
        {
            throw new UnauthorizedAccessException("Bu işlem için yetkiniz yok.");
        }
    }

    public async Task<Product> CreateOrderAsync(string sellerId, string sellerName, Product order)
    {
        if (order == null || string.IsNullOrWhiteSpace(order.Code))
        {
            throw new ArgumentException("Geçersiz ürün verisi veya eksik ürün kodu!");
        }

        if (string.IsNullOrWhiteSpace(order.ManufacturerId))
        {
            throw new ArgumentException("Lütfen siparişin gönderileceği üreticiyi (Manufacturer) seçin!");
        }

        order.SellerId = sellerId;
        order.SellerName = sellerName;
        order.CreatedAt = DateTime.UtcNow.ToString("o");
        order.Status = OrderStatus.Awaiting;
        order.IsPendingApproval = true;
        order.Completed = false;
        order.IsDefective = false;
        order.IsReadBySeller = true;
        order.IsReadByMfr = false;
        order.Logs = new List<OrderLog>
        {
            new OrderLog
            {
                Timestamp = DateTime.UtcNow.ToString("o"),
                Status = OrderStatus.Awaiting,
                Message = "Sipariş oluşturuldu ve üretici onayına gönderildi.",
                UserId = sellerId,
                UserName = sellerName
            }
        };

        // Validate image size before storing (~5MB limit)
        ValidateImageSize(order.Image, "Sipariş görseli");

        // Deduct credit for order creation
        await _creditsService.DeductForOrderAsync(sellerId);

        order.Image = await _imageStorageService.StoreImageAsync(order.Image);

        await _productRepository.SaveAsync(order);

        // Real-time notification: new order created (notify seller and assigned manufacturer)
        await _hubContext.Clients.Users(order.ManufacturerId, sellerId).SendAsync("ReceiveOrderUpdate");

        return order;
    }


    public async Task<Product> UpdateProductAsync(string sellerId, string orderId, Product updatedOrder)
    {
        if (updatedOrder == null || string.IsNullOrWhiteSpace(updatedOrder.Code))
        {
            throw new ArgumentException("Geçersiz ürün verisi veya eksik ürün kodu!");
        }

        if (string.IsNullOrWhiteSpace(updatedOrder.ManufacturerId))
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
        string newMfrId = updatedOrder.ManufacturerId;

        // Handle image swapping safely
        string? oldImage = existing.Image;
        string? newImage = updatedOrder.Image;

        if (newImage != oldImage)
        {
            if (!string.IsNullOrEmpty(newImage) && newImage.StartsWith("data:image"))
            {
                // Validate image size before storing (~5MB limit)
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

        // Update fields
        existing.Code = updatedOrder.Code;
        existing.Text = updatedOrder.Text;
        existing.Length = updatedOrder.Length;
        existing.Extras = updatedOrder.Extras;
        existing.ManufacturerId = newMfrId;
        existing.ManufacturerName = updatedOrder.ManufacturerName;

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

        if (existing.Logs == null)
        {
            existing.Logs = new List<OrderLog>();
        }

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

        // Real-time notification: order updated. Notify seller, old manufacturer and new manufacturer
        var usersToNotify = new List<string> { sellerId, newMfrId };
        if (oldMfrId != newMfrId)
        {
            usersToNotify.Add(oldMfrId);
        }
        await _hubContext.Clients.Users(usersToNotify).SendAsync("ReceiveOrderUpdate");

        return existing;
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

        // Delete Firestore document
        await _productRepository.DeleteAsync(orderId);

        // Delete image file safely if not used elsewhere
        await TryDeleteImageAsync(image, sellerId, orderId);
        await TryDeleteDefectImageAsync(defectImage, sellerId, orderId);

        // Real-time notification
        await _hubContext.Clients.Users(mfrId, sellerId).SendAsync("ReceiveOrderUpdate");
    }

    private async Task TryDeleteImageAsync(string? imageUrl, string sellerId, string currentProductId)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return;

        // Base64 images are stored directly in Firestore — no physical file to delete.
        // Skip expensive DB queries for duplicate-check since DeleteImageAsync is a no-op for Base64.
        if (imageUrl.StartsWith("data:image"))
        {
            await _imageStorageService.DeleteImageAsync(imageUrl);
            return;
        }

        // For URL-based images (future cloud storage), check if referenced elsewhere before deleting.
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

        // Base64 images are stored directly in Firestore — no physical file to delete.
        // Skip expensive DB queries for duplicate-check since DeleteImageAsync is a no-op for Base64.
        if (imageUrl.StartsWith("data:image"))
        {
            await _imageStorageService.DeleteImageAsync(imageUrl);
            return;
        }

        // For URL-based images (future cloud storage), check if referenced elsewhere before deleting.
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


    public async Task UpdateOrderStatusAsync(string userId, string role, string orderId, string newStatus, string? defectNote = null, string? defectImage = null)
    {
        var product = await _productRepository.GetByIdAsync(orderId);
        if (product == null)
            throw new KeyNotFoundException("Sipariş bulunamadı!");

        ValidateOwnership(product, userId, role);

        string oldStatus = ResolveCurrentStatus(product);
        string userName = role == Roles.Seller ? product.SellerName : product.ManufacturerName;
        string logMsg = await ApplyStatusTransitionAsync(product, newStatus, oldStatus, role, defectNote, defectImage);

        AppendLog(product, userId, userName, logMsg);
        if (role == Roles.Seller)
        {
            product.IsReadBySeller = true;
            if (newStatus.Equals(OrderStatus.Shipped, StringComparison.OrdinalIgnoreCase))
            {
                product.IsReadByMfr = true;
            }
            else
            {
                product.IsReadByMfr = false;
            }
        }
        else if (role == Roles.Mfr)
        {
            product.IsReadByMfr = true;
            product.IsReadBySeller = false;
        }
        await _productRepository.SaveAsync(product);
        await _hubContext.Clients.Users(product.ManufacturerId, product.SellerId).SendAsync("ReceiveOrderUpdate");
    }

    // --- Private helpers for UpdateOrderStatusAsync ---

    private static void ValidateOwnership(Product product, string userId, string role)
    {
        if (role == Roles.Seller)
        {
            if (product.SellerId != userId)
                throw new UnauthorizedAccessException("Bu sipariş üzerinde işlem yapma yetkiniz yok.");
        }
        else if (role == Roles.Mfr)
        {
            if (product.ManufacturerId != userId)
                throw new UnauthorizedAccessException("Bu sipariş üzerinde işlem yapma yetkiniz yok.");
        }
        else
        {
            throw new UnauthorizedAccessException("Yetkisiz rol.");
        }
    }

    private static string ResolveCurrentStatus(Product product)
    {
        if (!string.IsNullOrEmpty(product.Status)) return product.Status;
        return product.IsDefective ? OrderStatus.Defective
             : product.Completed ? OrderStatus.Completed
             : product.IsPendingApproval ? OrderStatus.Awaiting
             : OrderStatus.Production;
    }

    private async Task<string> ApplyStatusTransitionAsync(
        Product product, string newStatus, string oldStatus,
        string role, string? defectNote, string? defectImage)
    {
        return newStatus switch
        {
            OrderStatus.Cancelled => ApplyCancelled(product, oldStatus, role),
            OrderStatus.Production => await ApplyProductionAsync(product, oldStatus, role),
            OrderStatus.Broken => ApplyBroken(product, oldStatus, role, defectNote),
            OrderStatus.Completed => ApplyCompleted(product, oldStatus, role),
            OrderStatus.Delivered => ApplyDelivered(product, oldStatus, role),
            OrderStatus.ToShip => ApplyToShip(product, oldStatus, role),
            OrderStatus.Defective => await ApplyDefectiveAsync(product, oldStatus, role, defectNote, defectImage),
            OrderStatus.Missing => await ApplyMissingAsync(product, oldStatus, role, defectNote, defectImage),
            OrderStatus.Shipped => ApplyShipped(product, oldStatus, role),
            _ => throw new ArgumentException("Geçersiz hedef durum!")
        };
    }

    private static string ApplyCancelled(Product p, string oldStatus, string role)
    {
        if (role != Roles.Seller)
            throw new UnauthorizedAccessException("Siparişi sadece satıcı iptal edebilir.");
        if (oldStatus != OrderStatus.Awaiting && oldStatus != OrderStatus.Corrected && oldStatus != OrderStatus.Broken)
            throw new InvalidOperationException("Üretime başlanmış olan siparişler iptal edilemez.");

        p.Status = OrderStatus.Cancelled;
        p.IsPendingApproval = false;
        p.IsDefective = false;
        p.Completed = false;
        return "Sipariş satıcı tarafından iptal edildi.";
    }

    private async Task<string> ApplyProductionAsync(Product p, string oldStatus, string role)
    {
        if (role != Roles.Mfr)
            throw new UnauthorizedAccessException("Siparişi sadece üretici üretime alabilir.");
        if (oldStatus != OrderStatus.Awaiting && oldStatus != OrderStatus.Corrected && oldStatus != OrderStatus.Defective && oldStatus != OrderStatus.Missing)
            throw new InvalidOperationException("Bu sipariş üretime alınamaz.");

        p.Status = OrderStatus.Production;
        p.Completed = false;
        p.IsDefective = false;
        p.IsPendingApproval = false;
        p.IsReproduction = oldStatus == OrderStatus.Defective || oldStatus == OrderStatus.Missing;

        string? oldDefectImage = p.DefectImage;
        p.DefectNote = null;
        p.DefectImage = null;
        await TryDeleteDefectImageAsync(oldDefectImage, p.SellerId, p.Id);

        return (oldStatus == OrderStatus.Awaiting || oldStatus == OrderStatus.Corrected)
            ? "Sipariş üretici tarafından onaylandı ve üretime alındı."
            : "Sorunlu sipariş üretici tarafından tekrar üretime alındı.";
    }

    private static string ApplyBroken(Product p, string oldStatus, string role, string? defectNote)
    {
        if (role != Roles.Mfr)
            throw new UnauthorizedAccessException("Bu işlemi sadece üretici gerçekleştirebilir.");
        if (oldStatus != OrderStatus.Awaiting && oldStatus != OrderStatus.Corrected)
            throw new InvalidOperationException("Sipariş bozuk olarak işaretlenemez.");

        p.Status = OrderStatus.Broken;
        p.IsPendingApproval = false;
        p.IsDefective = false;
        p.Completed = false;
        p.DefectNote = defectNote;
        return string.IsNullOrEmpty(defectNote)
            ? "Sipariş detayları yetersiz veya anlaşılmaz olduğu için üretici tarafından Bozuk olarak işaretlendi."
            : $"Sipariş detayları yetersiz veya anlaşılmaz olduğu için üretici tarafından Bozuk olarak işaretlendi. Açıklama: {defectNote}";
    }

    private static string ApplyCompleted(Product p, string oldStatus, string role)
    {
        if (role != Roles.Mfr)
            throw new UnauthorizedAccessException("Bu işlemi sadece üretici gerçekleştirebilir.");
        if (oldStatus != OrderStatus.Production)
            throw new InvalidOperationException("Üretimi tamamlanacak sipariş önce üretimde olmalıdır.");

        p.Status = OrderStatus.Completed;
        p.Completed = true;
        p.CompletedAt = DateTime.UtcNow.ToString("o");
        return "Üretici siparişin üretimini tamamladı.";
    }

    private static string ApplyDelivered(Product p, string oldStatus, string role)
    {
        if (role != Roles.Mfr)
            throw new UnauthorizedAccessException("Bu işlemi sadece üretici gerçekleştirebilir.");
        if (oldStatus != OrderStatus.Completed && oldStatus != OrderStatus.Defective && oldStatus != OrderStatus.Missing)
            throw new InvalidOperationException("Bu sipariş teslim edilemez.");

        p.Status = OrderStatus.Delivered;
        p.Completed = true;
        p.IsDefective = false;

        return oldStatus == OrderStatus.Completed
            ? "Sipariş üretici tarafından teslim edildi. Satıcı kontrolü bekleniyor."
            : "Düzeltilen/eksik sipariş üretici tarafından teslim edildi. Satıcı kontrolü bekleniyor.";
    }

    private static string ApplyToShip(Product p, string oldStatus, string role)
    {
        if (role != Roles.Seller)
            throw new UnauthorizedAccessException("Bu işlemi sadece satıcı gerçekleştirebilir.");
        if (oldStatus != OrderStatus.Delivered)
            throw new InvalidOperationException("Sipariş teslim edilmeden onaylanamaz.");

        p.Status = OrderStatus.ToShip;
        p.Completed = true;
        p.IsDefective = false;
        return "Sipariş satıcı tarafından kontrol edildi ve DOĞRU olarak onaylandı.";
    }

    private async Task<string> ApplyDefectiveAsync(Product p, string oldStatus, string role, string? defectNote, string? defectImage)
    {
        if (role != Roles.Seller)
            throw new UnauthorizedAccessException("Bu işlemi sadece satıcı gerçekleştirebilir.");
        if (oldStatus != OrderStatus.Delivered)
            throw new InvalidOperationException("Sipariş teslim edilmeden hata bildirilemez.");

        p.Status = OrderStatus.Defective;
        p.IsDefective = true;
        p.Completed = false;
        p.DefectNote = defectNote;
        await UpdateDefectImageAsync(p, defectImage);
        return $"Sipariş satıcı tarafından HATALI olarak işaretlendi. Açıklama: {defectNote}";
    }

    private async Task<string> ApplyMissingAsync(Product p, string oldStatus, string role, string? defectNote, string? defectImage)
    {
        if (role != Roles.Seller)
            throw new UnauthorizedAccessException("Bu işlemi sadece satıcı gerçekleştirebilir.");
        if (oldStatus != OrderStatus.Delivered)
            throw new InvalidOperationException("Sipariş teslim edilmeden eksik bildirilemez.");

        p.Status = OrderStatus.Missing;
        p.IsDefective = true;
        p.Completed = false;
        p.DefectNote = defectNote;
        await UpdateDefectImageAsync(p, defectImage);
        return $"Sipariş satıcı tarafından EKSİK olarak işaretlendi. Açıklama: {defectNote}";
    }

    private static string ApplyShipped(Product p, string oldStatus, string role)
    {
        if (role != Roles.Seller)
            throw new UnauthorizedAccessException("Bu işlemi sadece satıcı gerçekleştirebilir.");
        if (oldStatus != OrderStatus.ToShip)
            throw new InvalidOperationException("Sipariş DOĞRU olarak onaylanmadan kargolanamaz.");

        p.Status = OrderStatus.Shipped;
        p.Completed = true;
        p.IsDefective = false;
        return "Sipariş satıcı tarafından kargolandı.";
    }

    /// <summary>Handles base64 defect image upload/swap for defective and missing statuses.</summary>
    private async Task UpdateDefectImageAsync(Product p, string? newDefectImage)
    {
        if (newDefectImage == p.DefectImage) return;

        string? oldDefectImage = p.DefectImage;
        if (!string.IsNullOrEmpty(newDefectImage) && newDefectImage.StartsWith("data:image"))
        {
            ValidateImageSize(newDefectImage, "Hata görseli");
            p.DefectImage = await _imageStorageService.StoreImageAsync(newDefectImage);
            await TryDeleteDefectImageAsync(oldDefectImage, p.SellerId, p.Id);
        }
        else if (string.IsNullOrEmpty(newDefectImage))
        {
            p.DefectImage = null;
            await TryDeleteDefectImageAsync(oldDefectImage, p.SellerId, p.Id);
        }
        else
        {
            p.DefectImage = newDefectImage;
            if (oldDefectImage != newDefectImage)
                await TryDeleteDefectImageAsync(oldDefectImage, p.SellerId, p.Id);
        }
    }

    private static void AppendLog(Product product, string userId, string userName, string message)
    {
        product.Logs ??= new List<OrderLog>();
        product.Logs.Add(new OrderLog
        {
            Timestamp = DateTime.UtcNow.ToString("o"),
            Status = product.Status,
            Message = message,
            UserId = userId,
            UserName = userName
        });
    }

    public async Task<Product?> GetProductByIdAsync(string userId, string role, string orderId, CancellationToken cancellationToken = default)
    {
        var product = await _productRepository.GetByIdAsync(orderId, cancellationToken);
        if (product == null) return null;

        // Verify ownership access
        if (role == Roles.Seller && product.SellerId != userId) return null;
        if (role == Roles.Mfr && product.ManufacturerId != userId) return null;

        return product;
    }

    public async Task<int> MigrateProductStatusesAsync()
    {
        return await _productRepository.MigrateStatusesAsync();
    }

    public async Task RequestOrderCancellationAsync(string sellerId, string orderId)
    {
        var product = await _productRepository.GetByIdAsync(orderId);
        if (product == null)
            throw new KeyNotFoundException("Sipariş bulunamadı!");

        if (product.SellerId != sellerId)
            throw new UnauthorizedAccessException("Bu sipariş üzerinde işlem yapma yetkiniz yok.");

        string currentStatus = ResolveCurrentStatus(product);
        if (currentStatus != OrderStatus.Production)
            throw new InvalidOperationException("Yalnızca üretimdeki siparişler için iptal talebi oluşturulabilir.");

        if (product.CancelRequested)
            throw new InvalidOperationException("Bu sipariş için zaten aktif bir iptal talebi bulunuyor.");

        product.CancelRequested = true;
        product.IsReadBySeller = true;
        product.IsReadByMfr = false;
        AppendLog(product, sellerId, product.SellerName, "Sipariş için satıcı tarafından iptal talebi gönderildi.");
        await _productRepository.SaveAsync(product);
        await _hubContext.Clients.Users(product.ManufacturerId, product.SellerId).SendAsync("ReceiveOrderUpdate");
    }

    public async Task RespondToOrderCancellationAsync(string mfrId, string orderId, bool approve)
    {
        var product = await _productRepository.GetByIdAsync(orderId);
        if (product == null)
            throw new KeyNotFoundException("Sipariş bulunamadı!");

        if (product.ManufacturerId != mfrId)
            throw new UnauthorizedAccessException("Bu sipariş üzerinde işlem yapma yetkiniz yok.");

        if (!product.CancelRequested)
            throw new InvalidOperationException("Bu sipariş için aktif bir iptal talebi bulunmuyor.");

        product.CancelRequested = false;

        string logMsg;
        if (approve)
        {
            product.Status = OrderStatus.Cancelled;
            product.IsPendingApproval = false;
            product.IsDefective = false;
            product.Completed = false;
            logMsg = "Sipariş iptal talebi üretici tarafından onaylandı ve sipariş iptal edildi.";
        }
        else
        {
            logMsg = "Sipariş iptal talebi üretici tarafından reddedildi. Üretime devam ediliyor.";
        }

        AppendLog(product, mfrId, product.ManufacturerName, logMsg);
        product.IsReadByMfr = true;
        product.IsReadBySeller = false;
        await _productRepository.SaveAsync(product);
        await _hubContext.Clients.Users(product.ManufacturerId, product.SellerId).SendAsync("ReceiveOrderUpdate");
    }

    public async Task MarkStatusAsReadAsync(string userId, string role, string status)
    {
        var products = await GetUserProductsAsync(userId, role);
        var targetProducts = products.Where(p => {
            string currentStatus = ResolveCurrentStatus(p);
            
            bool statusMatches = false;
            if (status.Equals("defective", StringComparison.OrdinalIgnoreCase))
            {
                statusMatches = currentStatus.Equals(OrderStatus.Defective, StringComparison.OrdinalIgnoreCase) ||
                                currentStatus.Equals(OrderStatus.Missing, StringComparison.OrdinalIgnoreCase);
            }
            else if (status.Equals("shipped", StringComparison.OrdinalIgnoreCase))
            {
                statusMatches = currentStatus.Equals(OrderStatus.Shipped, StringComparison.OrdinalIgnoreCase) ||
                                currentStatus.Equals(OrderStatus.Cancelled, StringComparison.OrdinalIgnoreCase) ||
                                (role.Equals(Roles.Mfr, StringComparison.OrdinalIgnoreCase) && currentStatus.Equals(OrderStatus.ToShip, StringComparison.OrdinalIgnoreCase));
            }
            else if (status.Equals("awaiting", StringComparison.OrdinalIgnoreCase))
            {
                statusMatches = currentStatus.Equals(OrderStatus.Awaiting, StringComparison.OrdinalIgnoreCase) ||
                                currentStatus.Equals(OrderStatus.Corrected, StringComparison.OrdinalIgnoreCase);
            }
            else
            {
                statusMatches = currentStatus.Equals(status, StringComparison.OrdinalIgnoreCase);
            }

            if (!statusMatches) return false;

            if (role == Roles.Seller)
            {
                return !p.IsReadBySeller;
            }
            else
            {
                return !p.IsReadByMfr;
            }
        }).ToList();

        if (targetProducts.Count == 0) return;

        foreach (var p in targetProducts)
        {
            if (role == Roles.Seller)
            {
                p.IsReadBySeller = true;
            }
            else
            {
                p.IsReadByMfr = true;
            }
            await _productRepository.SaveAsync(p);
        }

        await _hubContext.Clients.User(userId).SendAsync("ReceiveOrderUpdate");
    }
}
