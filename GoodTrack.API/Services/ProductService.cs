using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Models;
using GoodTrack.API.Hubs;

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
        List<Product> products;
        if (role == "seller")
        {
            products = await _productRepository.GetProductsBySellerAsync(userId);
        }
        else if (role == "mfr")
        {
            products = await _productRepository.GetProductsByManufacturerAsync(userId);
        }
        else
        {
            throw new UnauthorizedAccessException("Bu işlem için yetkiniz yok.");
        }

        foreach (var p in products)
        {
            if (string.IsNullOrEmpty(p.Status))
            {
                if (p.IsDefective)
                {
                    p.Status = "defective";
                }
                else if (p.Completed)
                {
                    p.Status = "completed";
                }
                else if (p.IsPendingApproval)
                {
                    p.Status = "awaiting";
                }
                else
                {
                    p.Status = "production";
                }

                if (p.Logs == null || p.Logs.Count == 0)
                {
                    p.Logs = new List<OrderLog>
                    {
                        new OrderLog
                        {
                            Timestamp = p.CreatedAt ?? DateTime.UtcNow.ToString("o"),
                            Status = p.Status,
                            Message = "Sipariş durumu otomatik olarak eşleştirildi.",
                            UserId = "system",
                            UserName = "Sistem"
                        }
                    };
                }

                await _productRepository.SaveAsync(p);
            }
        }

        return products;
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
        order.Status = "awaiting";
        order.IsPendingApproval = true;
        order.Completed = false;
        order.IsDefective = false;
        order.Logs = new List<OrderLog>
        {
            new OrderLog
            {
                Timestamp = DateTime.UtcNow.ToString("o"),
                Status = "awaiting",
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

        if (existing.Status == "broken")
        {
            existing.Status = "corrected";
            existing.IsPendingApproval = true;
        }
        else if (string.IsNullOrEmpty(existing.Status))
        {
            existing.Status = "awaiting";
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
            Message = existing.Status == "corrected"
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

        // Check other products/orders
        var otherProducts = await _productRepository.GetProductsBySellerAsync(sellerId);
        bool isUsedInOthers = otherProducts.Exists(p => p.Id != currentProductId && p.Image == imageUrl);
        if (isUsedInOthers) return;

        // Check catalog
        var catalog = await _catalogRepository.GetCatalogBySellerAsync(sellerId);
        bool isUsedInCatalog = catalog.Exists(c => c.Image == imageUrl);
        if (isUsedInCatalog) return;

        // Safe to delete from disk
        await _imageStorageService.DeleteImageAsync(imageUrl);
    }

    private async Task TryDeleteDefectImageAsync(string? imageUrl, string sellerId, string currentProductId)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return;

        // Check if any other products of this user use this defect image
        var otherProducts = await _productRepository.GetProductsBySellerAsync(sellerId);
        bool isUsedInOthers = otherProducts.Exists(p => p.Id != currentProductId && p.DefectImage == imageUrl);
        if (isUsedInOthers) return;

        // Also check main images just in case (though highly unlikely)
        bool isUsedAsMain = otherProducts.Exists(p => p.Image == imageUrl);
        if (isUsedAsMain) return;

        var catalog = await _catalogRepository.GetCatalogBySellerAsync(sellerId);
        bool isUsedInCatalog = catalog.Exists(c => c.Image == imageUrl);
        if (isUsedInCatalog) return;

        // Safe to delete from disk
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

    public async Task ToggleOrderApprovalAsync(string userId, string role, string orderId, bool isPendingApproval)
    {
        var product = await _productRepository.GetByIdAsync(orderId);
        if (product == null)
        {
            throw new KeyNotFoundException("Sipariş bulunamadı!");
        }

        if (role == "mfr")
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
        else if (role == "seller")
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
        {
            throw new KeyNotFoundException("Sipariş bulunamadı!");
        }

        // Check ownership
        if (role == "seller")
        {
            if (product.SellerId != userId)
            {
                throw new UnauthorizedAccessException("Bu sipariş üzerinde işlem yapma yetkiniz yok.");
            }
        }
        else if (role == "mfr")
        {
            if (product.MfrId != userId)
            {
                throw new UnauthorizedAccessException("Bu sipariş üzerinde işlem yapma yetkiniz yok.");
            }
        }
        else
        {
            throw new UnauthorizedAccessException("Yetkisiz rol.");
        }

        string oldStatus = product.Status;
        if (string.IsNullOrEmpty(oldStatus))
        {
            oldStatus = product.IsDefective ? "defective" : (product.Completed ? "completed" : (product.IsPendingApproval ? "awaiting" : "production"));
        }

        // Validate transitions and roles
        string userName = role == "seller" ? product.SellerName : product.MfrName;
        string logMsg = "";

        if (newStatus == "cancelled")
        {
            if (role != "seller")
                throw new UnauthorizedAccessException("Siparişi sadece satıcı iptal edebilir.");
            if (oldStatus != "awaiting" && oldStatus != "corrected" && oldStatus != "broken")
                throw new InvalidOperationException("Üretime başlanmış olan siparişler iptal edilemez.");
            
            product.Status = "cancelled";
            product.IsPendingApproval = false;
            product.IsDefective = false;
            product.Completed = false;
            logMsg = "Sipariş satıcı tarafından iptal edildi.";
        }
        else if (newStatus == "production")
        {
            if (role != "mfr")
                throw new UnauthorizedAccessException("Siparişi sadece üretici üretime alabilir.");
            if (oldStatus != "awaiting" && oldStatus != "corrected" && oldStatus != "defective" && oldStatus != "missing")
                throw new InvalidOperationException("Bu sipariş üretime alınamaz.");

            product.Status = "production";
            product.Completed = false;
            product.IsDefective = false;
            product.IsPendingApproval = false;

            // Clear defect data if any
            string? oldDefectImage = product.DefectImage;
            product.DefectNote = null;
            product.DefectImage = null;
            await TryDeleteDefectImageAsync(oldDefectImage, product.SellerId, product.Id);

            if (oldStatus == "awaiting" || oldStatus == "corrected")
                logMsg = "Sipariş üretici tarafından onaylandı ve üretime alındı.";
            else
                logMsg = "Sorunlu sipariş üretici tarafından tekrar üretime alındı.";
        }
        else if (newStatus == "broken")
        {
            if (role != "mfr")
                throw new UnauthorizedAccessException("Bu işlemi sadece üretici gerçekleştirebilir.");
            if (oldStatus != "awaiting" && oldStatus != "corrected")
                throw new InvalidOperationException("Sipariş bozuk olarak işaretlenemez.");

            product.Status = "broken";
            product.IsPendingApproval = false;
            product.IsDefective = false;
            product.Completed = false;
            logMsg = "Sipariş detayları yetersiz veya anlaşılmaz olduğu için üretici tarafından Bozuk olarak işaretlendi.";
        }
        else if (newStatus == "completed")
        {
            if (role != "mfr")
                throw new UnauthorizedAccessException("Bu işlemi sadece üretici gerçekleştirebilir.");
            if (oldStatus != "production")
                throw new InvalidOperationException("Üretimi tamamlanacak sipariş önce üretimde olmalıdır.");

            product.Status = "completed";
            product.Completed = true;
            product.CompletedAt = DateTime.UtcNow.ToString("o");
            logMsg = "Üretici siparişin üretimini tamamladı.";
        }
        else if (newStatus == "delivered")
        {
            if (role != "mfr")
                throw new UnauthorizedAccessException("Bu işlemi sadece üretici gerçekleştirebilir.");
            if (oldStatus != "completed" && oldStatus != "defective" && oldStatus != "missing")
                throw new InvalidOperationException("Bu sipariş teslim edilemez.");

            product.Status = "delivered";
            product.Completed = true;
            product.IsDefective = false;

            if (oldStatus == "completed")
                logMsg = "Sipariş üretici tarafından teslim edildi. Satıcı kontrolü bekleniyor.";
            else
                logMsg = "Düzeltilen/eksik sipariş üretici tarafından teslim edildi. Satıcı kontrolü bekleniyor.";
        }
        else if (newStatus == "to_ship")
        {
            if (role != "seller")
                throw new UnauthorizedAccessException("Bu işlemi sadece satıcı gerçekleştirebilir.");
            if (oldStatus != "delivered")
                throw new InvalidOperationException("Sipariş teslim edilmeden onaylanamaz.");

            product.Status = "to_ship";
            product.Completed = true;
            product.IsDefective = false;
            logMsg = "Sipariş satıcı tarafından kontrol edildi ve DOĞRU olarak onaylandı.";
        }
        else if (newStatus == "defective")
        {
            if (role != "seller")
                throw new UnauthorizedAccessException("Bu işlemi sadece satıcı gerçekleştirebilir.");
            if (oldStatus != "delivered")
                throw new InvalidOperationException("Sipariş teslim edilmeden hata bildirilemez.");

            product.Status = "defective";
            product.IsDefective = true;
            product.Completed = false;
            product.DefectNote = defectNote;

            // Handle base64 defect image upload
            if (defectImage != product.DefectImage)
            {
                string? oldDefectImage = product.DefectImage;
                if (!string.IsNullOrEmpty(defectImage) && defectImage.StartsWith("data:image"))
                {
                    product.DefectImage = await _imageStorageService.StoreImageAsync(defectImage);
                    await TryDeleteDefectImageAsync(oldDefectImage, product.SellerId, product.Id);
                }
                else if (string.IsNullOrEmpty(defectImage))
                {
                    product.DefectImage = null;
                    await TryDeleteDefectImageAsync(oldDefectImage, product.SellerId, product.Id);
                }
                else
                {
                    product.DefectImage = defectImage;
                    if (oldDefectImage != defectImage)
                    {
                        await TryDeleteDefectImageAsync(oldDefectImage, product.SellerId, product.Id);
                    }
                }
            }

            logMsg = $"Sipariş satıcı tarafından HATALI olarak işaretlendi. Açıklama: {defectNote}";
        }
        else if (newStatus == "missing")
        {
            if (role != "seller")
                throw new UnauthorizedAccessException("Bu işlemi sadece satıcı gerçekleştirebilir.");
            if (oldStatus != "delivered")
                throw new InvalidOperationException("Sipariş teslim edilmeden eksik bildirilemez.");

            product.Status = "missing";
            product.IsDefective = true;
            product.Completed = false;
            product.DefectNote = defectNote;

            // Handle base64 defect image upload (just in case)
            if (defectImage != product.DefectImage)
            {
                string? oldDefectImage = product.DefectImage;
                if (!string.IsNullOrEmpty(defectImage) && defectImage.StartsWith("data:image"))
                {
                    product.DefectImage = await _imageStorageService.StoreImageAsync(defectImage);
                    await TryDeleteDefectImageAsync(oldDefectImage, product.SellerId, product.Id);
                }
                else if (string.IsNullOrEmpty(defectImage))
                {
                    product.DefectImage = null;
                    await TryDeleteDefectImageAsync(oldDefectImage, product.SellerId, product.Id);
                }
                else
                {
                    product.DefectImage = defectImage;
                    if (oldDefectImage != defectImage)
                    {
                        await TryDeleteDefectImageAsync(oldDefectImage, product.SellerId, product.Id);
                    }
                }
            }

            logMsg = $"Sipariş satıcı tarafından EKSİK olarak işaretlendi. Açıklama: {defectNote}";
        }
        else if (newStatus == "shipped")
        {
            if (role != "seller")
                throw new UnauthorizedAccessException("Bu işlemi sadece satıcı gerçekleştirebilir.");
            if (oldStatus != "to_ship")
                throw new InvalidOperationException("Sipariş DOĞRU olarak onaylanmadan kargolanamaz.");

            product.Status = "shipped";
            product.Completed = true;
            product.IsDefective = false;
            logMsg = "Sipariş satıcı tarafından kargolandı.";
        }
        else
        {
            throw new ArgumentException("Geçersiz hedef durum!");
        }

        // Add log entry
        if (product.Logs == null)
        {
            product.Logs = new List<OrderLog>();
        }

        product.Logs.Add(new OrderLog
        {
            Timestamp = DateTime.UtcNow.ToString("o"),
            Status = product.Status,
            Message = logMsg,
            UserId = userId,
            UserName = userName
        });

        await _productRepository.SaveAsync(product);

        // Notify real-time
        await _hubContext.Clients.Users(product.MfrId, product.SellerId).SendAsync("ReceiveOrderUpdate");
    }
}
