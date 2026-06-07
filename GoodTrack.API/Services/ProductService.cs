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

        // Delete Firestore document
        await _productRepository.DeleteAsync(orderId);

        // Delete image file safely if not used elsewhere
        await TryDeleteImageAsync(image, sellerId, orderId);

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

    public async Task ToggleOrderDefectiveAsync(string sellerId, string orderId, bool isDefective)
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
        }

        await _productRepository.SaveAsync(product);

        // Real-time notification: order defective status toggled (notify seller and assigned manufacturer)
        await _hubContext.Clients.Users(product.MfrId, sellerId).SendAsync("ReceiveOrderUpdate");
    }
}
