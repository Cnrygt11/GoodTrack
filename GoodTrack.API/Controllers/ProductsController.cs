using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using Microsoft.Extensions.Logging;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Models;
using GoodTrack.API.DTOs.Product;
using GoodTrack.API.Constants;

namespace GoodTrack.API.Controllers;

[Authorize]
public class ProductsController : BaseApiController
{
    private readonly IProductService _productService;
    private readonly ILogger<ProductsController> _logger;

    public ProductsController(IProductService productService, ILogger<ProductsController> logger)
    {
        _productService = productService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetCurrentUserId();
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (userId is null || string.IsNullOrEmpty(role))
        {
            return Unauthorized(new { message = "Kullanıcı kimliği bulunamadı." });
        }

        _logger.LogInformation("Retrieving products list for User: {UserId} with Role: {Role}", userId, role);
        var products = await _productService.GetUserProductsAsync(userId, role);
        return Ok(products);
    }

    [HttpPost]
    [Authorize(Roles = Roles.Seller)]
    public async Task<IActionResult> Create([FromBody] Product product)
    {
        var userId = GetCurrentUserId();
        var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? "Satıcı";

        if (userId is null)
        {
            return Unauthorized();
        }

        _logger.LogInformation("Seller user {UserId} is submitting a new production order: {Code}", userId, product.Code);
        var created = await _productService.CreateOrderAsync(userId, userName, product);
        return Ok(new { product = created, message = "Sipariş başarıyla üretime gönderildi." });
    }

    // LEGACY: This endpoint predates UpdateOrderStatusAsync.
    // Consider consolidating into UpdateOrderStatusAsync in a future cleanup.
    // Currently kept for backwards compatibility.
    [HttpPut("{id}/complete")]
    [Authorize(Roles = Roles.Mfr)]
    public async Task<IActionResult> ToggleComplete(string id, [FromBody] ToggleCompleteRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        _logger.LogInformation("Manufacturer user {UserId} is toggling completion for order {Id} to: {Completed}", userId, id, request.Completed);
        await _productService.ToggleOrderCompletionAsync(userId, id, request.Completed);
        return Ok(new { id, completed = request.Completed, message = "Sipariş durumu başarıyla güncellendi." });
    }

    [HttpPut("{id}/defective")]
    [Authorize(Roles = Roles.Seller)]
    public async Task<IActionResult> ToggleDefective(string id, [FromBody] ToggleDefectiveRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        if (request == null)
        {
            return BadRequest(new { message = "İstek verisi eksik." });
        }

        _logger.LogInformation("Seller user {UserId} is toggling defective status for order {Id} to: {IsDefective}", userId, id, request.IsDefective);
        await _productService.ToggleOrderDefectiveAsync(userId, id, request.IsDefective, request.DefectNote, request.DefectImage);
        return Ok(new { id, isDefective = request.IsDefective, message = request.IsDefective ? "Sipariş hatalı olarak işaretlendi." : "Sipariş hata durumu kaldırıldı." });
    }


    // LEGACY: This endpoint predates UpdateOrderStatusAsync.
    // Consider consolidating into UpdateOrderStatusAsync in a future cleanup.
    // Currently kept for backwards compatibility.
    [HttpPut("{id}/approval")]
    public async Task<IActionResult> ToggleApproval(string id, [FromBody] ToggleApprovalRequest request)
    {
        var userId = GetCurrentUserId();
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (userId is null || string.IsNullOrEmpty(role))
        {
            return Unauthorized();
        }

        _logger.LogInformation("User {UserId} with role {Role} is toggling approval status for order {Id} to: {IsPendingApproval}", userId, role, id, request.IsPendingApproval);
        await _productService.ToggleOrderApprovalAsync(userId, role, id, request.IsPendingApproval);
        return Ok(new { id, isPendingApproval = request.IsPendingApproval, message = "Sipariş onay durumu güncellendi." });
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateStatusRequest request)
    {
        var userId = GetCurrentUserId();
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (userId is null || string.IsNullOrEmpty(role))
        {
            return Unauthorized();
        }

        if (request == null || string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest(new { message = "Hedef durum bilgisi eksik." });
        }

        _logger.LogInformation("User {UserId} with role {Role} is changing status of order {Id} to: {Status}", userId, role, id, request.Status);

        try
        {
            await _productService.UpdateOrderStatusAsync(userId, role, id, request.Status, request.DefectNote, request.DefectImage);
            return Ok(new { id, status = request.Status, message = "Sipariş durumu başarıyla güncellendi." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = Roles.Seller)]
    public async Task<IActionResult> Update(string id, [FromBody] Product product)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        _logger.LogInformation("Seller user {UserId} is updating production order: {Id}", userId, id);
        var updated = await _productService.UpdateProductAsync(userId, id, product);
        return Ok(new { product = updated, message = "Sipariş başarıyla güncellendi." });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var userId = GetCurrentUserId();
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (userId is null || string.IsNullOrEmpty(role))
        {
            return Unauthorized();
        }

        _logger.LogInformation("User {UserId} is retrieving single production order details: {Id}", userId, id);
        var product = await _productService.GetProductByIdAsync(userId, role, id);
        if (product == null)
        {
            return NotFound(new { message = "Sipariş bulunamadı veya erişim yetkiniz yok." });
        }

        return Ok(product);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = Roles.Seller)]
    public async Task<IActionResult> Delete(string id)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        _logger.LogInformation("Seller user {UserId} is deleting production order: {Id}", userId, id);
        await _productService.DeleteProductAsync(userId, id);
        return Ok(new { message = "Sipariş başarıyla silindi." });
    }

    [HttpPost("migrate-statuses")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> MigrateStatuses()
    {
        _logger.LogInformation("Admin triggered a status migration.");
        var count = await _productService.MigrateProductStatusesAsync();
        return Ok(new { message = $"{count} sipariş başarıyla güncellendi." });
    }

    [HttpPost("{id}/cancel-request")]
    [Authorize(Roles = Roles.Seller)]
    public async Task<IActionResult> RequestCancellation(string id)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        _logger.LogInformation("Seller {UserId} requesting cancellation for order {Id}", userId, id);
        try
        {
            await _productService.RequestOrderCancellationAsync(userId, id);
            return Ok(new { message = "İptal talebi üreticiye iletildi." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/cancel-request/respond")]
    [Authorize(Roles = Roles.Mfr)]
    public async Task<IActionResult> RespondToCancellation(string id, [FromBody] RespondToCancellationRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        if (request == null)
        {
            return BadRequest(new { message = "İstek verisi eksik." });
        }

        _logger.LogInformation("Manufacturer {UserId} responding to cancellation for order {Id} with: {Approve}", userId, id, request.Approve);
        try
        {
            await _productService.RespondToOrderCancellationAsync(userId, id, request.Approve);
            string msg = request.Approve ? "İptal talebi onaylandı, sipariş iptal edildi." : "İptal talebi reddedildi, üretime devam ediliyor.";
            return Ok(new { message = msg });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
