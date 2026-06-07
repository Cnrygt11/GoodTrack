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
        if (role == "seller")
        {
            return await _productRepository.GetProductsBySellerAsync(userId);
        }
        else if (role == "mfr")
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
        existing.IsPendingApproval = false; // Reset approval status if updated by seller

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
            if (product.SellerId != userId)
            {
                throw new UnauthorizedAccessException("Bu siparişin durumunu değiştirme yetkiniz yok!");
            }
            product.IsPendingApproval = isPendingApproval;
        }
        else
        {
            throw new UnauthorizedAccessException("Yetkisiz işlem!");
        }

        await _productRepository.SaveAsync(product);
        await _hubContext.Clients.Users(product.MfrId, product.SellerId).SendAsync("ReceiveOrderUpdate");
    }
}
