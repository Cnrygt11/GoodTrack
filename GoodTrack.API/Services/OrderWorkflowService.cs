using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Models;
using GoodTrack.API.Hubs;
using GoodTrack.API.Constants;

namespace GoodTrack.API.Services;

public sealed class OrderWorkflowService : IOrderWorkflowService
{
    private readonly IProductRepository _productRepository;
    private readonly ICatalogRepository _catalogRepository;
    private readonly IHubContext<TrackingHub> _hubContext;
    private readonly IImageStorageService _imageStorageService;
    private readonly ICreditsService _creditsService;
    private readonly ILogger<OrderWorkflowService> _logger;
    private readonly Dictionary<string, StatusTransitionRule> _transitionRules;

    public OrderWorkflowService(
        IProductRepository productRepository, 
        ICatalogRepository catalogRepository,
        IHubContext<TrackingHub> hubContext,
        IImageStorageService imageStorageService,
        ICreditsService creditsService,
        ILogger<OrderWorkflowService> logger)
    {
        _productRepository = productRepository;
        _catalogRepository = catalogRepository;
        _hubContext = hubContext;
        _imageStorageService = imageStorageService;
        _creditsService = creditsService;
        _logger = logger;

        _transitionRules = new Dictionary<string, StatusTransitionRule>(StringComparer.OrdinalIgnoreCase)
        {
            {
                OrderStatus.Cancelled,
                new StatusTransitionRule
                {
                    RequiredRole = Roles.Seller,
                    AllowedSourceStatuses = new(StringComparer.OrdinalIgnoreCase) { OrderStatus.Awaiting, OrderStatus.Corrected, OrderStatus.Broken },
                    ErrorMessage = "Üretime başlanmış olan siparişler iptal edilemez.",
                    TransitionAction = async (p, oldStatus, note, img) =>
                    {
                        p.Status = OrderStatus.Cancelled;
                        p.IsPendingApproval = false;
                        p.IsDefective = false;
                        p.Completed = false;
                        await _creditsService.RefundCreditAsync(p.SellerId);
                        return "Sipariş satıcı tarafından iptal edildi.";
                    }
                }
            },
            {
                OrderStatus.Production,
                new StatusTransitionRule
                {
                    RequiredRole = Roles.Mfr,
                    AllowedSourceStatuses = new(StringComparer.OrdinalIgnoreCase) { OrderStatus.Awaiting, OrderStatus.Corrected, OrderStatus.Defective, OrderStatus.Missing },
                    ErrorMessage = "Bu sipariş üretime alınamaz.",
                    TransitionAction = async (p, oldStatus, note, img) =>
                    {
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
                }
            },
            {
                OrderStatus.Broken,
                new StatusTransitionRule
                {
                    RequiredRole = Roles.Mfr,
                    AllowedSourceStatuses = new(StringComparer.OrdinalIgnoreCase) { OrderStatus.Awaiting, OrderStatus.Corrected },
                    ErrorMessage = "Sipariş bozuk olarak işaretlenemez.",
                    TransitionAction = (p, oldStatus, note, img) =>
                    {
                        p.Status = OrderStatus.Broken;
                        p.IsPendingApproval = false;
                        p.IsDefective = false;
                        p.Completed = false;
                        p.DefectNote = note;
                        return Task.FromResult(string.IsNullOrEmpty(note)
                            ? "Sipariş detayları yetersiz veya anlaşılmaz olduğu için üretici tarafından Bozuk olarak işaretlendi."
                            : $"Sipariş detayları yetersiz veya anlaşılmaz olduğu için üretici tarafından Bozuk olarak işaretlendi. Açıklama: {note}");
                    }
                }
            },
            {
                OrderStatus.Completed,
                new StatusTransitionRule
                {
                    RequiredRole = Roles.Mfr,
                    AllowedSourceStatuses = new(StringComparer.OrdinalIgnoreCase) { OrderStatus.Production },
                    ErrorMessage = "Üretimi tamamlanacak sipariş önce üretimde olmalıdır.",
                    TransitionAction = (p, oldStatus, note, img) =>
                    {
                        p.Status = OrderStatus.Completed;
                        p.Completed = true;
                        p.CompletedAt = DateTime.UtcNow;
                        return Task.FromResult("Üretici siparişin üretimini tamamladı.");
                    }
                }
            },
            {
                OrderStatus.Delivered,
                new StatusTransitionRule
                {
                    RequiredRole = Roles.Mfr,
                    AllowedSourceStatuses = new(StringComparer.OrdinalIgnoreCase) { OrderStatus.Completed, OrderStatus.Defective, OrderStatus.Missing },
                    ErrorMessage = "Bu sipariş teslim edilemez.",
                    TransitionAction = (p, oldStatus, note, img) =>
                    {
                        p.Status = OrderStatus.Delivered;
                        p.Completed = true;
                        p.IsDefective = false;

                        var msg = oldStatus == OrderStatus.Completed
                            ? "Sipariş üretici tarafından teslim edildi. Satıcı kontrolü bekleniyor."
                            : "Düzeltilen/eksik sipariş üretici tarafından teslim edildi. Satıcı kontrolü bekleniyor.";
                        return Task.FromResult(msg);
                    }
                }
            },
            {
                OrderStatus.ToShip,
                new StatusTransitionRule
                {
                    RequiredRole = Roles.Seller,
                    AllowedSourceStatuses = new(StringComparer.OrdinalIgnoreCase) { OrderStatus.Delivered },
                    ErrorMessage = "Sipariş teslim edilmeden onaylanamaz.",
                    TransitionAction = (p, oldStatus, note, img) =>
                    {
                        p.Status = OrderStatus.ToShip;
                        p.Completed = true;
                        p.IsDefective = false;
                        return Task.FromResult("Sipariş satıcı tarafından kontrol edildi ve DOĞRU olarak onaylandı.");
                    }
                }
            },
            {
                OrderStatus.Defective,
                new StatusTransitionRule
                {
                    RequiredRole = Roles.Seller,
                    AllowedSourceStatuses = new(StringComparer.OrdinalIgnoreCase) { OrderStatus.Delivered },
                    ErrorMessage = "Sipariş teslim edilmeden hata bildirilemez.",
                    TransitionAction = async (p, oldStatus, note, img) =>
                    {
                        p.Status = OrderStatus.Defective;
                        p.IsDefective = true;
                        p.Completed = false;
                        p.DefectNote = note;
                        await UpdateDefectImageAsync(p, img);
                        return $"Sipariş satıcı tarafından HATALI olarak işaretlendi. Açıklama: {note}";
                    }
                }
            },
            {
                OrderStatus.Missing,
                new StatusTransitionRule
                {
                    RequiredRole = Roles.Seller,
                    AllowedSourceStatuses = new(StringComparer.OrdinalIgnoreCase) { OrderStatus.Delivered },
                    ErrorMessage = "Sipariş teslim edilmeden eksik bildirilemez.",
                    TransitionAction = async (p, oldStatus, note, img) =>
                    {
                        p.Status = OrderStatus.Missing;
                        p.IsDefective = true;
                        p.Completed = false;
                        p.DefectNote = note;
                        await UpdateDefectImageAsync(p, img);
                        return $"Sipariş satıcı tarafından EKSİK olarak işaretlendi. Açıklama: {note}";
                    }
                }
            },
            {
                OrderStatus.Shipped,
                new StatusTransitionRule
                {
                    RequiredRole = Roles.Seller,
                    AllowedSourceStatuses = new(StringComparer.OrdinalIgnoreCase) { OrderStatus.ToShip },
                    ErrorMessage = "Sipariş DOĞRU olarak onaylanmadan kargolanamaz.",
                    TransitionAction = (p, oldStatus, note, img) =>
                    {
                        p.Status = OrderStatus.Shipped;
                        p.Completed = true;
                        p.IsDefective = false;
                        return Task.FromResult("Sipariş satıcı tarafından kargolandı.");
                    }
                }
            }
        };
    }

    private const int MaxImageBase64Length = 7_000_000;

    private static void ValidateImageSize(string? base64Image, string fieldName = "Görsel")
    {
        if (!string.IsNullOrEmpty(base64Image) && base64Image.Length > MaxImageBase64Length)
        {
            throw new ArgumentException($"{fieldName} boyutu çok büyük! Maksimum 5MB desteklenmektedir.");
        }
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
        await SafeNotifyUsersAsync(new[] { product.ManufacturerId, product.SellerId }, "ReceiveOrderUpdate");
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
        await SafeNotifyUsersAsync(new[] { product.ManufacturerId, product.SellerId }, "ReceiveOrderUpdate");
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
            await _creditsService.RefundCreditAsync(product.SellerId);
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
        await SafeNotifyUsersAsync(new[] { product.ManufacturerId, product.SellerId }, "ReceiveOrderUpdate");
    }

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
        if (!_transitionRules.TryGetValue(newStatus, out var rule))
        {
            throw new ArgumentException("Geçersiz hedef durum!");
        }

        if (!role.Equals(rule.RequiredRole, StringComparison.OrdinalIgnoreCase))
        {
            var roleText = rule.RequiredRole == Roles.Seller ? "satıcı" : "üretici";
            throw new UnauthorizedAccessException($"Bu işlemi sadece {roleText} gerçekleştirebilir.");
        }

        if (!rule.AllowedSourceStatuses.Contains(oldStatus))
        {
            throw new InvalidOperationException(rule.ErrorMessage);
        }

        return await rule.TransitionAction(product, oldStatus, defectNote, defectImage);
    }

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
