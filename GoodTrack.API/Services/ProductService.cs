using System;
using System.Collections.Generic;
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

    public ProductService(
        IProductRepository productRepository, 
        ICatalogRepository catalogRepository,
        IHubContext<TrackingHub> hubContext,
        IImageStorageService imageStorageService)
    {
        _productRepository = productRepository;
        _catalogRepository = catalogRepository;
        _hubContext = hubContext;
        _imageStorageService = imageStorageService;
    }

    public async Task<List<Product>> GetUserProductsAsync(string userId, string role)
    {
        if (role == Roles.Seller)
        {
            return await _productRepository.GetProductsBySellerAsync(userId);
        }
        else if (role == Roles.Mfr)
        {
            return await _productRepository.GetProductsByManufacturerAsync(userId);
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

        if (string.IsNullOrWhiteSpace(order.MfrId))
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

        order.Image = await _imageStorageService.StoreImageAsync(order.Image);

        await _productRepository.SaveAsync(order);

        // Real-time notification: new order created (notify seller and assigned manufacturer)
        await _hubContext.Clients.Users(order.MfrId, sellerId).SendAsync("ReceiveOrderUpdate");

        return order;
    }

    // LEGACY: This endpoint predates UpdateOrderStatusAsync.
    // Consider consolidating into UpdateOrderStatusAsync in a future cleanup.
    // Currently kept for backwards compatibility.
    public async Task ToggleOrderCompletionAsync(string mfrId, string orderId, bool completed)
    {
        var product = await _productRepository.GetByIdAsync(orderId);
        if (product == null)
        {
            throw new KeyNotFoundException("Ürün bulunamadı!");
        }

        if (product.MfrId != mfrId)
        {
            throw new UnauthorizedAccessException("Bu siparişin durumunu değiştirme yetkiniz yok!");
        }

        product.Completed = completed;
        if (completed)
        {
            product.IsDefective = false; // Reset defective status if fixed/completed again
            product.IsPendingApproval = false; // Reset approval status if completed
            product.CompletedAt = DateTime.UtcNow.ToString("o");
            string? oldDefectImage = product.DefectImage;
            product.DefectNote = null;
            product.DefectImage = null;
            await TryDeleteDefectImageAsync(oldDefectImage, product.SellerId, product.Id);
        }
        else
        {
            product.CompletedAt = null;
        }
        await _productRepository.SaveAsync(product);

        // Real-time notification: order status toggled (notify manufacturer and seller)
        await _hubContext.Clients.Users(mfrId, product.SellerId).SendAsync("ReceiveOrderUpdate");
    }

    public async Task<Product> UpdateProductAsync(string sellerId, string orderId, Product updatedOrder)
    {
        if (updatedOrder == null || string.IsNullOrWhiteSpace(updatedOrder.Code))
        {
            throw new ArgumentException("Geçersiz ürün verisi veya eksik ürün kodu!");
        }

        if (string.IsNullOrWhiteSpace(updatedOrder.MfrId))
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

        string oldMfrId = existing.MfrId;
        string newMfrId = updatedOrder.MfrId;

        // Handle image swapping safely
        string? oldImage = existing.Image;
        string? newImage = updatedOrder.Image;

        if (newImage != oldImage)
        {
            if (!string.IsNullOrEmpty(newImage) && newImage.StartsWith("data:image"))
            {
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
        existing.MfrId = newMfrId;
        existing.MfrName = updatedOrder.MfrName;

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

        string mfrId = existing.MfrId;
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

    public async Task ToggleOrderDefectiveAsync(string sellerId, string orderId, bool isDefective, string? defectNote, string? defectImage)
    {
        var product = await _productRepository.GetByIdAsync(orderId);
        if (product == null)
        {
            throw new KeyNotFoundException("Sipariş bulunamadı!");
        }

        if (product.SellerId != sellerId)
        {
            throw new UnauthorizedAccessException("Bu siparişin hata durumunu değiştirme yetkiniz yok!");
        }

        product.IsDefective = isDefective;
        if (isDefective)
        {
            product.Completed = false; // Set completed to false so manufacturer must fix it
            product.IsPendingApproval = false; // Reset pending approval if defective
            product.DefectNote = defectNote;

            // Handle base64 defect image upload
            if (defectImage != product.DefectImage)
            {
                string? oldDefectImage = product.DefectImage;
                if (!string.IsNullOrEmpty(defectImage) && defectImage.StartsWith("data:image"))
                {
                    product.DefectImage = await _imageStorageService.StoreImageAsync(defectImage);
                    await TryDeleteDefectImageAsync(oldDefectImage, sellerId, orderId);
                }
                else if (string.IsNullOrEmpty(defectImage))
                {
                    product.DefectImage = null;
                    await TryDeleteDefectImageAsync(oldDefectImage, sellerId, orderId);
                }
                else
                {
                    product.DefectImage = defectImage;
                    if (oldDefectImage != defectImage)
                    {
                        await TryDeleteDefectImageAsync(oldDefectImage, sellerId, orderId);
                    }
                }
            }
        }
        else
        {
            string? oldDefectImage = product.DefectImage;
            product.DefectNote = null;
            product.DefectImage = null;
            await TryDeleteDefectImageAsync(oldDefectImage, sellerId, orderId);
        }

        await _productRepository.SaveAsync(product);

        // Real-time notification: order defective status toggled (notify seller and assigned manufacturer)
        await _hubContext.Clients.Users(product.MfrId, sellerId).SendAsync("ReceiveOrderUpdate");
    }

    // LEGACY: This endpoint predates UpdateOrderStatusAsync.
    // Consider consolidating into UpdateOrderStatusAsync in a future cleanup.
    // Currently kept for backwards compatibility.
    public async Task ToggleOrderApprovalAsync(string userId, string role, string orderId, bool isPendingApproval)
    {
        var product = await _productRepository.GetByIdAsync(orderId);
        if (product == null)
        {
            throw new KeyNotFoundException("Sipariş bulunamadı!");
        }

        if (role == Roles.Mfr)
        {
            if (product.MfrId != userId)
            {
                throw new UnauthorizedAccessException("Bu siparişin durumunu değiştirme yetkiniz yok!");
            }
            product.IsPendingApproval = isPendingApproval;
            if (isPendingApproval)
            {
                product.Completed = false;
                product.IsDefective = false; // Reset defective status if sent to awaiting approval
            }
        }
        else if (role == Roles.Seller)
        {
            throw new UnauthorizedAccessException("Satıcıların onay bekleyen siparişlerin onay durumunu değiştirme veya üretime alma yetkisi yoktur!");
        }
        else
        {
            throw new UnauthorizedAccessException("Yetkisiz işlem!");
        }

        await _productRepository.SaveAsync(product);
        await _hubContext.Clients.Users(product.MfrId, product.SellerId).SendAsync("ReceiveOrderUpdate");
    }

    public async Task UpdateOrderStatusAsync(string userId, string role, string orderId, string newStatus, string? defectNote = null, string? defectImage = null)
    {
        var product = await _productRepository.GetByIdAsync(orderId);
        if (product == null)
            throw new KeyNotFoundException("Sipariş bulunamadı!");

        ValidateOwnership(product, userId, role);

        string oldStatus = ResolveCurrentStatus(product);
        string userName = role == Roles.Seller ? product.SellerName : product.MfrName;
        string logMsg = await ApplyStatusTransitionAsync(product, newStatus, oldStatus, role, defectNote, defectImage);

        AppendLog(product, userId, userName, logMsg);
        await _productRepository.SaveAsync(product);
        await _hubContext.Clients.Users(product.MfrId, product.SellerId).SendAsync("ReceiveOrderUpdate");
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
            if (product.MfrId != userId)
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
            OrderStatus.Broken => ApplyBroken(product, oldStatus, role),
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

        string? oldDefectImage = p.DefectImage;
        p.DefectNote = null;
        p.DefectImage = null;
        await TryDeleteDefectImageAsync(oldDefectImage, p.SellerId, p.Id);

        return (oldStatus == OrderStatus.Awaiting || oldStatus == OrderStatus.Corrected)
            ? "Sipariş üretici tarafından onaylandı ve üretime alındı."
            : "Sorunlu sipariş üretici tarafından tekrar üretime alındı.";
    }

    private static string ApplyBroken(Product p, string oldStatus, string role)
    {
        if (role != Roles.Mfr)
            throw new UnauthorizedAccessException("Bu işlemi sadece üretici gerçekleştirebilir.");
        if (oldStatus != OrderStatus.Awaiting && oldStatus != OrderStatus.Corrected)
            throw new InvalidOperationException("Sipariş bozuk olarak işaretlenemez.");

        p.Status = OrderStatus.Broken;
        p.IsPendingApproval = false;
        p.IsDefective = false;
        p.Completed = false;
        return "Sipariş detayları yetersiz veya anlaşılmaz olduğu için üretici tarafından Bozuk olarak işaretlendi.";
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

    public async Task<Product?> GetProductByIdAsync(string userId, string role, string orderId)
    {
        var product = await _productRepository.GetByIdAsync(orderId);
        if (product == null) return null;

        // Verify ownership access
        if (role == Roles.Seller && product.SellerId != userId) return null;
        if (role == Roles.Mfr && product.MfrId != userId) return null;

        return product;
    }

    public async Task<int> MigrateProductStatusesAsync()
    {
        return await _productRepository.MigrateStatusesAsync();
    }
}
